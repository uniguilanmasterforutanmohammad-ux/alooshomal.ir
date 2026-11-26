package ir.alooshomal.smsgateway.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.content.ContextCompat

data class InboxSms(
    val body: String,
    val address: String?,
    val date: Long,
)

/**
 * Reads recent inbox messages so a newly paired phone can backfill deposits
 * that arrived while the app was not installed. Only runs with READ_SMS.
 */
object SmsInboxReader {

    fun hasReadPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_SMS,
        ) == PackageManager.PERMISSION_GRANTED

    fun readRecent(context: Context, sinceMillis: Long, limit: Int = 200): List<InboxSms> {
        if (!hasReadPermission(context)) return emptyList()
        val rows = mutableListOf<InboxSms>()
        val projection = arrayOf(
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
        )
        context.contentResolver.query(
            Telephony.Sms.Inbox.CONTENT_URI,
            projection,
            "${Telephony.Sms.DATE} >= ?",
            arrayOf(sinceMillis.toString()),
            "${Telephony.Sms.DATE} DESC",
        )?.use { cursor ->
            val addressIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val bodyIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val dateIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
            while (cursor.moveToNext() && rows.size < limit) {
                val body = cursor.getString(bodyIndex) ?: continue
                rows += InboxSms(
                    body = body,
                    address = cursor.getString(addressIndex),
                    date = cursor.getLong(dateIndex),
                )
            }
        }
        return rows
    }

    /** Parses and enqueues every recent bank deposit; returns how many were found. */
    fun backfill(context: Context, hours: Int = 48): Int {
        val since = System.currentTimeMillis() - hours * 60L * 60L * 1000L
        var queued = 0
        for (row in readRecent(context, since)) {
            val parsed = BankSmsParser.parse(row.body, row.address, row.date) ?: continue
            SmsSyncWorker.enqueue(context, parsed)
            queued += 1
        }
        return queued
    }
}
