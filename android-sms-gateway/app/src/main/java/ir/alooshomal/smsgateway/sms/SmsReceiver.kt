package ir.alooshomal.smsgateway.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/**
 * Receives incoming SMS and hands the message to WorkManager. The receiver does
 * no network I/O itself, so Android can finish the broadcast immediately and
 * the upload survives process death or a temporary network loss.
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isEmpty()) return
        val body = messages.joinToString(separator = "") { it.messageBody.orEmpty() }
        val sender = messages.firstOrNull()?.originatingAddress
        val receivedAt = messages.firstOrNull()?.timestampMillis
            ?: System.currentTimeMillis()
        val parsed = BankSmsParser.parse(body, sender, receivedAt) ?: return
        SmsSyncWorker.enqueue(context, parsed)
    }
}
