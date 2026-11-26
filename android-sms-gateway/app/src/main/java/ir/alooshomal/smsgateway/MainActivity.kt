package ir.alooshomal.smsgateway

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.foundation.text.KeyboardOptions
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import ir.alooshomal.smsgateway.data.DeviceTransaction
import ir.alooshomal.smsgateway.ui.AppViewModel
import ir.alooshomal.smsgateway.ui.UiState
import ir.alooshomal.smsgateway.ui.theme.AlooshomalTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AlooshomalTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Surface(modifier = Modifier.fillMaxSize()) {
                        AppRoot()
                    }
                }
            }
        }
    }
}

@Composable
private fun AppRoot(viewModel: AppViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var permissionTick by remember { mutableIntStateOf(0) }
    var showSettings by remember { mutableStateOf(false) }
    var showPrivacy by remember { mutableStateOf(false) }

    val smsGranted = remember(permissionTick) { hasSmsPermissions(context) }
    val notificationsGranted = remember(permissionTick) {
        hasNotificationPermission(context)
    }
    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { permissionTick += 1 }

    fun requestPermissions() {
        val permissions = buildList {
            add(Manifest.permission.RECEIVE_SMS)
            add(Manifest.permission.READ_SMS)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }

    when {
        !state.paired -> OnboardingScreen(
            state = state,
            smsGranted = smsGranted,
            onPair = viewModel::pair,
            onRequestPermissions = ::requestPermissions,
            onShowPrivacy = { showPrivacy = true },
            onDismissMessages = viewModel::clearMessages,
        )
        showSettings -> SettingsScreen(
            state = state,
            smsGranted = smsGranted,
            notificationsGranted = notificationsGranted,
            onBack = { showSettings = false },
            onRefresh = viewModel::refresh,
            onUnpair = {
                viewModel.unpair()
                showSettings = false
            },
            onShowPrivacy = { showPrivacy = true },
        )
        else -> HomeScreen(
            state = state,
            smsGranted = smsGranted,
            notificationsGranted = notificationsGranted,
            onSettings = { showSettings = true },
            onRefresh = viewModel::refresh,
            onSync = viewModel::syncInbox,
            onRequestPermissions = ::requestPermissions,
            onDismissMessages = viewModel::clearMessages,
        )
    }

    if (showPrivacy) {
        PrivacyDialog(onClose = { showPrivacy = false })
    }
}

@Composable
private fun OnboardingScreen(
    state: UiState,
    smsGranted: Boolean,
    onPair: (String, String, String) -> Unit,
    onRequestPermissions: () -> Unit,
    onShowPrivacy: () -> Unit,
    onDismissMessages: () -> Unit,
) {
    var serverUrl by remember { mutableStateOf(state.serverUrl) }
    var code by remember { mutableStateOf("") }
    var deviceName by remember {
        mutableStateOf(state.deviceName.ifBlank { Build.MODEL })
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .navigationBarsPadding()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = "پیامک‌یار الوشمال",
            fontSize = 26.sp,
            fontWeight = FontWeight.Black,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "این گوشی پیامک‌های واریز بانکی را می‌خواند و پرداخت سفارش‌های کارت‌به‌کارت فروشگاه شما را خودکار تأیید می‌کند.",
            style = MaterialTheme.typography.bodyMedium,
            lineHeight = 24.sp,
        )

        StepCard(
            number = "۱",
            title = "کد اتصال را از پنل بگیرید",
            body = "در پنل کسب‌وکار ← کارت به کارت ← دروازه‌ی پیامک بانکی، یک کد یک‌بارمصرف بسازید.",
        )
        StepCard(
            number = "۲",
            title = "دسترسی پیامک را بدهید",
            body = "فقط پیامک‌های واریز بانکی خوانده می‌شوند. هیچ پیامکی روی سرور ذخیره نمی‌شود مگر متن همان واریزی که برای تطبیق ارسال می‌شود.",
        )
        StepCard(
            number = "۳",
            title = "اتصال را کامل کنید",
            body = "آدرس سرور، کد اتصال و نام گوشی را وارد کنید. پس از اتصال، این گوشی در پنل دیده می‌شود.",
        )

        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it },
            label = { Text("آدرس سرور") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = code,
            onValueChange = { code = it.uppercase().take(8) },
            label = { Text("کد اتصال (۸ کاراکتر)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Characters,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = deviceName,
            onValueChange = { deviceName = it.take(60) },
            label = { Text("نام این گوشی") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        PermissionCard(
            granted = smsGranted,
            title = "دسترسی خواندن پیامک",
            body = "برای تشخیص واریزهای بانکی لازم است.",
            onRequest = onRequestPermissions,
        )

        Button(
            onClick = { onPair(serverUrl, code, deviceName) },
            enabled = !state.busy,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state.busy) {
                CircularProgressIndicator(
                    modifier = Modifier.height(18.dp),
                    strokeWidth = 2.dp,
                )
            } else {
                Text("اتصال به پنل فروشگاه")
            }
        }

        MessageBanner(state = state, onDismiss = onDismissMessages)

        TextButton(onClick = onShowPrivacy, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Default.Lock, contentDescription = null)
            Spacer(Modifier.height(0.dp))
            Text("  سیاست حریم خصوصی")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeScreen(
    state: UiState,
    smsGranted: Boolean,
    notificationsGranted: Boolean,
    onSettings: () -> Unit,
    onRefresh: () -> Unit,
    onSync: () -> Unit,
    onRequestPermissions: () -> Unit,
    onDismissMessages: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("پیامک‌یار الوشمال", fontWeight = FontWeight.Bold)
                        Text(
                            "اتصال فعال",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "تنظیمات")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        state.workspaceName.ifBlank { "کسب‌وکار" },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text("کارت مقصد: ${state.cardMasked.ifBlank { "ثبت نشده" }}")
                    Text("سفارش‌های در انتظار پرداخت: ${state.pendingOrders}")
                }
            }

            if (!smsGranted) {
                PermissionCard(
                    granted = false,
                    title = "دسترسی پیامک خاموش است",
                    body = "تا زمانی که دسترسی خواندن پیامک داده نشود، واریزی‌ها تشخیص داده نمی‌شوند.",
                    onRequest = onRequestPermissions,
                )
            }
            if (!notificationsGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                PermissionCard(
                    granted = false,
                    title = "اعلان‌ها خاموش است",
                    body = "برای دیدن نتیجه‌ی تأیید خودکار، اجازه‌ی اعلان را بدهید.",
                    onRequest = onRequestPermissions,
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onSync,
                    enabled = smsGranted && !state.busy,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Text("  همگام‌سازی پیامک‌ها")
                }
                OutlinedButton(
                    onClick = onRefresh,
                    enabled = !state.busy,
                    modifier = Modifier.weight(1f),
                ) {
                    if (state.busy) {
                        CircularProgressIndicator(
                            modifier = Modifier.height(16.dp),
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text("به‌روزرسانی وضعیت")
                    }
                }
            }

            MessageBanner(state = state, onDismiss = onDismissMessages)

            Text(
                "آخرین پیامک‌های ارسال‌شده",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
            if (state.transactions.isEmpty()) {
                Text(
                    "هنوز واریزی‌ای ثبت نشده است.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                state.transactions.forEach { transaction ->
                    TransactionCard(transaction)
                }
            }

            HorizontalDivider()
            Text(
                "روش دستی ارسال رسید در پنل فروشگاه همچنان فعال است و با فعال‌بودن این اپ تغییری نمی‌کند.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 20.sp,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(
    state: UiState,
    smsGranted: Boolean,
    notificationsGranted: Boolean,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onUnpair: () -> Unit,
    onShowPrivacy: () -> Unit,
) {
    var confirmUnpair by remember { mutableStateOf(false) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("تنظیمات") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "بازگشت")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            InfoRow("کسب‌وکار", state.workspaceName.ifBlank { "—" })
            InfoRow("کارت مقصد", state.cardMasked.ifBlank { "—" })
            InfoRow("نام دستگاه", state.deviceName.ifBlank { "—" })
            InfoRow("آدرس سرور", state.serverUrl)
            InfoRow("نسخه اپ", BuildConfig.VERSION_NAME)
            InfoRow("دسترسی پیامک", if (smsGranted) "فعال" else "خاموش")
            InfoRow("اعلان‌ها", if (notificationsGranted) "فعال" else "خاموش")

            OutlinedButton(onClick = onRefresh, modifier = Modifier.fillMaxWidth()) {
                Text("به‌روزرسانی وضعیت")
            }
            OutlinedButton(onClick = onShowPrivacy, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Lock, contentDescription = null)
                Text("  سیاست حریم خصوصی")
            }
            Button(
                onClick = { confirmUnpair = true },
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error,
                ),
            ) {
                Text("قطع اتصال این گوشی")
            }
        }
    }

    if (confirmUnpair) {
        AlertDialog(
            onDismissRequest = { confirmUnpair = false },
            title = { Text("قطع اتصال") },
            text = {
                Text("پس از قطع اتصال، این گوشی دیگر واریزی‌ها را به پنل ارسال نمی‌کند. برای اتصال دوباره به کد تازه نیاز دارید.")
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmUnpair = false
                    onUnpair()
                }) { Text("قطع کن") }
            },
            dismissButton = {
                TextButton(onClick = { confirmUnpair = false }) { Text("انصراف") }
            },
        )
    }
}

@Composable
private fun StepCard(number: String, title: String, body: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(
                color = MaterialTheme.colorScheme.primary,
                shape = MaterialTheme.shapes.small,
            ) {
                Text(
                    number,
                    color = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    fontWeight = FontWeight.Bold,
                )
            }
            Column {
                Text(title, fontWeight = FontWeight.Bold)
                Text(
                    body,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 20.sp,
                )
            }
        }
    }
}

@Composable
private fun PermissionCard(
    granted: Boolean,
    title: String,
    body: String,
    onRequest: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (granted) {
                MaterialTheme.colorScheme.surfaceVariant
            } else {
                MaterialTheme.colorScheme.errorContainer
            },
        ),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(
                if (granted) Icons.Default.CheckCircle else Icons.Default.Warning,
                contentDescription = null,
                tint = if (granted) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.error
                },
            )
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold)
                Text(body, style = MaterialTheme.typography.bodySmall, lineHeight = 19.sp)
            }
            if (!granted) {
                TextButton(onClick = onRequest) { Text("اجازه دادن") }
            }
        }
    }
}

@Composable
private fun MessageBanner(state: UiState, onDismiss: () -> Unit) {
    val message = state.error ?: state.info
    if (message.isNullOrBlank()) return
    val isError = state.error != null
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isError) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.primaryContainer
            },
        ),
    ) {
        Row(
            Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                message,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodySmall,
                lineHeight = 20.sp,
            )
            TextButton(onClick = onDismiss) { Text("بستن") }
        }
    }
}

@Composable
private fun TransactionCard(transaction: DeviceTransaction) {
    val (label, color) = when (transaction.status) {
        "AUTO_APPROVED" -> "تأیید خودکار" to MaterialTheme.colorScheme.primary
        "MANUALLY_LINKED" -> "تطبیق دستی" to MaterialTheme.colorScheme.primary
        "AMBIGUOUS" -> "چند سفارش هم‌مبلغ" to MaterialTheme.colorScheme.secondary
        "IGNORED" -> "نادیده‌گرفته" to MaterialTheme.colorScheme.onSurfaceVariant
        else -> "نیاز به بررسی" to MaterialTheme.colorScheme.secondary
    }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    formatPrice(transaction.amount),
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                Text(label, color = color, style = MaterialTheme.typography.labelMedium)
            }
            Text(
                buildString {
                    append(transaction.bankName ?: "بانک نامشخص")
                    if (!transaction.orderNumber.isNullOrBlank()) {
                        append(" — سفارش ")
                        append(transaction.orderNumber)
                    }
                },
                style = MaterialTheme.typography.bodySmall,
            )
            Text(
                formatDateTime(transaction.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.End,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}

@Composable
private fun PrivacyDialog(onClose: () -> Unit) {
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("سیاست حریم خصوصی") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    "۱. این اپ فقط برای فروشنده‌ای است که کسب‌وکارش را در الوشمال ثبت کرده و گوشی را با کد اتصال به پنل وصل می‌کند.",
                    style = MaterialTheme.typography.bodySmall,
                    lineHeight = 20.sp,
                )
                Text(
                    "۲. دسترسی پیامک فقط برای تشخیص پیامک‌های «واریز بانکی» استفاده می‌شود. پیامک‌های شخصی، تبلیغاتی یا رمز یک‌بارمصرف خوانده و ارسال نمی‌شوند.",
                    style = MaterialTheme.typography.bodySmall,
                    lineHeight = 20.sp,
                )
                Text(
                    "۳. متن همان پیامک واریز، مبلغ، چهار رقم آخر کارت مقصد و شماره پیگیری برای تطبیق سفارش به سرور الوشمال ارسال می‌شود.",
                    style = MaterialTheme.typography.bodySmall,
                    lineHeight = 20.sp,
                )
                Text(
                    "۴. توکن اتصال به‌صورت رمزنگاری‌شده روی همین گوشی نگه داشته می‌شود و با قطع اتصال از پنل یا تنظیمات اپ پاک می‌شود.",
                    style = MaterialTheme.typography.bodySmall,
                    lineHeight = 20.sp,
                )
                Text(
                    "۵. هیچ داده‌ای برای تبلیغات یا فروش به شخص ثالث استفاده نمی‌شود.",
                    style = MaterialTheme.typography.bodySmall,
                    lineHeight = 20.sp,
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onClose) { Text("متوجه شدم") }
        },
    )
}

private fun hasSmsPermissions(context: Context): Boolean =
    ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.RECEIVE_SMS,
    ) == PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_SMS,
        ) == PackageManager.PERMISSION_GRANTED

private fun hasNotificationPermission(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED

private fun formatPrice(value: Int): String =
    String.format(Locale("fa", "IR"), "%,d تومان", value)

private fun formatDateTime(iso: String): String = runCatching {
    val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
    val date = parser.parse(iso.take(19)) ?: Date()
    SimpleDateFormat("yyyy/MM/dd HH:mm", Locale("fa", "IR")).format(date)
}.getOrDefault(iso)
