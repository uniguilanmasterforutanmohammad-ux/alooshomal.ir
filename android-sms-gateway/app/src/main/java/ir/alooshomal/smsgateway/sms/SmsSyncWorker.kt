package ir.alooshomal.smsgateway.sms

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import ir.alooshomal.smsgateway.BuildConfig
import ir.alooshomal.smsgateway.data.ApiClient
import ir.alooshomal.smsgateway.data.ApiException
import ir.alooshomal.smsgateway.data.AppSettings
import ir.alooshomal.smsgateway.data.ReportSmsRequest
import ir.alooshomal.smsgateway.notifications.Notifications
import java.time.Instant
import java.util.concurrent.TimeUnit

class SmsSyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val settings = AppSettings(applicationContext)
        val token = settings.deviceToken ?: return Result.success()
        val rawText = inputData.getString(KEY_RAW_TEXT) ?: return Result.failure()
        val amount = inputData.getInt(KEY_AMOUNT, 0)
        if (amount <= 0) return Result.failure()

        val payload = ReportSmsRequest(
            rawText = rawText,
            amount = amount,
            destinationLast4 = inputData.getString(KEY_LAST4),
            destinationCard = inputData.getString(KEY_CARD),
            bankName = inputData.getString(KEY_BANK),
            trackingNumber = inputData.getString(KEY_TRACKING),
            smsId = inputData.getString(KEY_SMS_ID),
            smsReceivedAt = inputData.getLong(KEY_RECEIVED_AT, 0L)
                .takeIf { it > 0 }
                ?.let { Instant.ofEpochMilli(it).toString() },
        )

        return try {
            val result = ApiClient(BuildConfig.VERSION_NAME).report(
                serverUrl = settings.serverUrl,
                token = token,
                payload = payload,
            )
            if (!result.duplicate) {
                when (result.status) {
                    "AUTO_APPROVED" -> Notifications.show(
                        applicationContext,
                        NOTIFICATION_ID,
                        "پرداخت تأیید شد",
                        result.message
                            ?: "سفارش ${result.orderNumber.orEmpty()} به‌صورت خودکار تأیید شد.",
                    )
                    "UNMATCHED", "AMBIGUOUS" -> Notifications.show(
                        applicationContext,
                        NOTIFICATION_ID,
                        "واریز ثبت شد؛ نیاز به بررسی",
                        result.message ?: "از پنل کسب‌وکار سفارش را تطبیق دهید.",
                    )
                }
            }
            Result.success()
        } catch (error: ApiException) {
            when {
                error.statusCode == 401 -> {
                    Notifications.show(
                        applicationContext,
                        NOTIFICATION_ID,
                        "اتصال دستگاه قطع شده",
                        "لطفاً از پنل کسب‌وکار کد اتصال تازه بگیرید و دوباره متصل شوید.",
                    )
                    Result.failure()
                }
                error.statusCode in 400..499 -> {
                    Notifications.show(
                        applicationContext,
                        NOTIFICATION_ID,
                        "ارسال پیامک ناموفق بود",
                        error.message ?: "خطای سرور",
                    )
                    Result.failure()
                }
                else -> Result.retry()
            }
        }
    }

    companion object {
        private const val KEY_RAW_TEXT = "rawText"
        private const val KEY_AMOUNT = "amount"
        private const val KEY_LAST4 = "last4"
        private const val KEY_CARD = "card"
        private const val KEY_BANK = "bank"
        private const val KEY_TRACKING = "tracking"
        private const val KEY_SMS_ID = "smsId"
        private const val KEY_RECEIVED_AT = "receivedAt"
        private const val NOTIFICATION_ID = 1001

        fun enqueue(context: Context, parsed: ParsedSms) {
            if (parsed.amountToman <= 0 || parsed.amountToman > 1_000_000_000) return
            val data = Data.Builder()
                .putString(KEY_RAW_TEXT, parsed.rawText)
                .putInt(KEY_AMOUNT, parsed.amountToman.toInt())
                .putString(KEY_LAST4, parsed.destinationLast4)
                .putString(KEY_CARD, parsed.destinationCard)
                .putString(KEY_BANK, parsed.bankName)
                .putString(KEY_TRACKING, parsed.trackingNumber)
                .putString(KEY_SMS_ID, parsed.smsId)
                .putLong(KEY_RECEIVED_AT, parsed.receivedAtMillis)
                .build()
            val request = OneTimeWorkRequestBuilder<SmsSyncWorker>()
                .setInputData(data)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "sms-${parsed.smsId}",
                ExistingWorkPolicy.KEEP,
                request,
            )
        }
    }
}
