package ir.alooshomal.smsgateway.sms

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class BankSmsParserTest {

    @Test
    fun parsesRialDepositWithMaskedCard() {
        val parsed = BankSmsParser.parse(
            """
            بانک ملی
            واریز به حساب
            مبلغ: 4,500,000 ریال
            کارت مقصد: 6037******5678
            شماره پیگیری: 998877
            """.trimIndent(),
            sender = "+983000",
            receivedAtMillis = 1_700_000_000_000,
        )
        assertNotNull(parsed)
        assertEquals(450_000L, parsed!!.amountToman)
        assertEquals("5678", parsed.destinationLast4)
        assertNull(parsed.destinationCard)
        assertEquals("998877", parsed.trackingNumber)
        assertEquals("بانک ملی", parsed.bankName)
    }

    @Test
    fun parsesTomanDepositWithFullCard() {
        val parsed = BankSmsParser.parse(
            "بانک ملت\nواریز: 450,000 تومان\nبه کارت 6104-3377-1234-5678",
            sender = "BankMellat",
            receivedAtMillis = 1_700_000_000_000,
        )
        assertNotNull(parsed)
        assertEquals(450_000L, parsed!!.amountToman)
        assertEquals("5678", parsed.destinationLast4)
        assertEquals("6104337712345678", parsed.destinationCard)
    }

    @Test
    fun ignoresWithdrawalsAndPurchases() {
        assertNull(
            BankSmsParser.parse(
                "برداشت از حساب شما: 500,000 ریال",
                sender = null,
                receivedAtMillis = 1,
            ),
        )
        assertNull(
            BankSmsParser.parse(
                "خرید موفق از فروشگاه؛ مبلغ 500,000 ریال",
                sender = null,
                receivedAtMillis = 1,
            ),
        )
    }

    @Test
    fun ignoresOtpMessages() {
        assertNull(
            BankSmsParser.parse(
                "رمز یک‌بارمصرف شما 123456 است",
                sender = null,
                receivedAtMillis = 1,
            ),
        )
    }

    @Test
    fun normalizesPersianDigits() {
        val parsed = BankSmsParser.parse(
            "واریز ۴۵۰٬۰۰۰ تومان به کارت ۶۰۳۷******۵۶۷۸",
            sender = null,
            receivedAtMillis = 1,
        )
        assertNotNull(parsed)
        assertEquals(450_000L, parsed!!.amountToman)
        assertEquals("5678", parsed.destinationLast4)
    }

    @Test
    fun usesTrailingDigitsOfMaskedCard() {
        val parsed = BankSmsParser.parse(
            "واریز 1,000,000 ریال به کارت ******4321",
            sender = null,
            receivedAtMillis = 1,
        )
        assertNotNull(parsed)
        assertEquals("4321", parsed!!.destinationLast4)
    }
}
