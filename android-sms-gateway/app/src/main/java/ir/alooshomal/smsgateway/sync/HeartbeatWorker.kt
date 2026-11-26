package ir.alooshomal.smsgateway.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import ir.alooshomal.smsgateway.BuildConfig
import ir.alooshomal.smsgateway.data.ApiClient
import ir.alooshomal.smsgateway.data.ApiException
import ir.alooshomal.smsgateway.data.AppSettings
import java.util.concurrent.TimeUnit

/**
 * Keeps the "last seen" timestamp fresh in the seller panel even when the app
 * is never opened. Without it the panel would only learn the phone is alive
 * when a deposit arrives or the seller taps refresh.
 */
class HeartbeatWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val settings = AppSettings(applicationContext)
        val token = settings.deviceToken ?: return Result.success()
        return try {
            ApiClient(BuildConfig.VERSION_NAME).heartbeat(settings.serverUrl, token)
            Result.success()
        } catch (error: ApiException) {
            when {
                // The device was revoked or the feature was disabled: stop
                // retrying instead of waking up forever.
                error.statusCode == 401 || error.statusCode == 403 -> {
                    cancel(applicationContext)
                    Result.success()
                }
                error.statusCode in 400..499 -> Result.success()
                else -> Result.retry()
            }
        }
    }

    companion object {
        private const val UNIQUE_WORK = "sms-gateway-heartbeat"
        private const val INTERVAL_HOURS = 6L

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<HeartbeatWorker>(
                INTERVAL_HOURS,
                TimeUnit.HOURS,
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK)
        }
    }
}
