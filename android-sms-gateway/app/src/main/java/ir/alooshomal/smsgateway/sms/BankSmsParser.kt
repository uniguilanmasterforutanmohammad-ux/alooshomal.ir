package ir.alooshomal.smsgateway.sms

import java.security.MessageDigest

data class ParsedSms(
    val rawText: String,
    val amountToman: Long,
    val destinationLast4: String?,
    val destinationCard: String?,
    val bankName: String?,
    val trackingNumber: String?,
    val smsId: String,
    val receivedAtMillis: Long,
)

/**
 * Extracts a card-to-card deposit from an Iranian bank SMS.
 *
 * Deliberately conservative: if the message does not look like an incoming
 * deposit, or the amount cannot be read, it returns `null` so the app never
 * sends a purchase/withdrawal to the server. The server additionally checks
 * that the destination card belongs to the business.
 */
object BankSmsParser {

    private val incomingHints = listOf(
        "واریز", "به حساب شما", "افزایش موجودی", "دریافت", "credited", "deposit",
    )
    private val outgoingHints = listOf(
        "برداشت", "خرید", "کسر از حساب", "انتقال از حساب", "debit", "withdraw",
    )

    private val amountPatterns = listOf(
        Regex(
            "(?:مبلغ|واریز|واریزی|به مبلغ)\\s*:?\\s*([0-9][0-9,]{2,})\\s*(ریال|تومان|تومن)?",
        ),
        Regex("([0-9][0-9,]{3,})\\s*(ریال|تومان|تومن)"),
    )

    private val cardNearKeyword = Regex(
        "(?:کارت|حساب)\\s*(?:مقصد|واریز|شما)?[^0-9*]{0,25}([0-9*]{12,19})",
    )
    private val last4NearKeyword = Regex(
        "(?:به کارت|کارت مقصد|حساب مقصد|واریز به کارت)[^0-9]{0,15}\\**([0-9]{4})(?![0-9])",
    )
    private val maskedCard = Regex("([0-9]{4})\\*{4,}([0-9]{4})")
    private val maskedLast4 = Regex("\\*{4,}([0-9]{4})(?![0-9])")
    private val trackingPattern = Regex(
        "(?:شماره\\s*پیگیری|پیگیری|رهگیری|کد\\s*پیگیری|رسید)\\s*:?\\s*([0-9]{4,})",
    )

    private val bankNames = listOf(
        "ملی", "ملت", "صادرات", "تجارت", "سپه", "کشاورزی", "مسکن", "پاسارگاد",
        "سامان", "پارسیان", "رفاه", "آینده", "شهر", "اقتصاد نوین", "سینا",
        "پست بانک", "قوامین", "دی", "مهر ایران", "رسالت", "صنعت و معدن",
        "توسعه صادرات", "کارآفرین", "گردشگری", "ایران زمین", "خاورمیانه",
        "شمال", "البرز", "بلو", "توسعه تعاون",
    )

    fun parse(
        rawText: String,
        sender: String?,
        receivedAtMillis: Long,
    ): ParsedSms? {
        val text = normalizeDigits(rawText)
        if (text.isBlank()) return null
        val lowered = text.lowercase()
        val looksIncoming = incomingHints.any { lowered.contains(it.lowercase()) }
        if (!looksIncoming) return null
        val looksOutgoing = outgoingHints.any { lowered.contains(it.lowercase()) }
        if (looksOutgoing && !text.contains("واریز")) return null

        val amount = extractAmount(text) ?: return null
        if (amount <= 0) return null

        val card = extractCard(text)
        val tracking = trackingPattern.find(text)?.groupValues?.getOrNull(1)
        val bank = extractBank(text, sender)
        val smsId = buildSmsId(rawText, receivedAtMillis)

        return ParsedSms(
            rawText = rawText.trim(),
            amountToman = amount,
            destinationLast4 = card?.last4,
            destinationCard = card?.full,
            bankName = bank,
            trackingNumber = tracking,
            smsId = smsId,
            receivedAtMillis = receivedAtMillis,
        )
    }

    private fun extractAmount(text: String): Long? {
        for (pattern in amountPatterns) {
            val match = pattern.find(text) ?: continue
            val rawValue = match.groupValues.getOrNull(1)
                ?.replace(",", "")
                ?.toLongOrNull() ?: continue
            if (rawValue <= 0) continue
            val unit = match.groupValues.getOrNull(2)?.trim().orEmpty()
            return when (unit) {
                "ریال" -> rawValue / 10
                "تومان", "تومن" -> rawValue
                else -> if (rawValue >= 1_000_000) rawValue / 10 else rawValue
            }
        }
        return null
    }

    private data class CardMatch(val full: String?, val last4: String)

    private fun extractCard(text: String): CardMatch? {
        val compact = text.replace(Regex("[\\s\\-]"), "")
        // Masked cards such as `6037******5678` keep the first and last four
        // digits; the trailing group is the real last4, not the leading one.
        maskedCard.find(compact)?.let { match ->
            return CardMatch(full = null, last4 = match.groupValues[2])
        }
        val near = cardNearKeyword.find(compact)?.groupValues?.getOrNull(1)
        if (near != null) {
            val digits = near.filter { it.isDigit() }
            if (digits.length == 16) {
                return CardMatch(full = digits, last4 = digits.takeLast(4))
            }
        }
        last4NearKeyword.find(text)?.groupValues?.getOrNull(1)?.let {
            return CardMatch(full = null, last4 = it)
        }
        maskedLast4.find(compact)?.groupValues?.getOrNull(1)?.let {
            return CardMatch(full = null, last4 = it)
        }
        return null
    }

    private fun extractBank(text: String, sender: String?): String? {
        val haystack = "$text ${sender.orEmpty()}"
        val persian = bankNames.firstOrNull { haystack.contains("بانک $it") }
        if (persian != null) return "بانک $persian"
        val english = listOf(
            "melli" to "بانک ملی",
            "mellat" to "بانک ملت",
            "saderat" to "بانک صادرات",
            "tejarat" to "بانک تجارت",
            "parsian" to "بانک پارسیان",
            "pasargad" to "بانک پاسارگاد",
            "saman" to "بانک سامان",
            "refah" to "بانک رفاه",
            "sepah" to "بانک سپه",
            "keshavarzi" to "بانک کشاورزی",
        ).firstOrNull { haystack.lowercase().contains(it.first) }
        return english?.second
    }

    private fun buildSmsId(rawText: String, receivedAtMillis: Long): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$receivedAtMillis|$rawText".toByteArray())
        return digest.joinToString("") { "%02x".format(it) }.take(40)
    }

    /** Persian (۰-۹) and Arabic (٠-٩) digits → ASCII, Arabic comma → comma. */
    fun normalizeDigits(input: String): String = buildString(input.length) {
        for (char in input) {
            append(
                when {
                    char in '۰'..'۹' -> '0' + (char - '۰')
                    char in '٠'..'٩' -> '0' + (char - '٠')
                    char == '،' || char == '٬' -> ','
                    char == '\u200c' -> ' '
                    else -> char
                },
            )
        }
    }
}
