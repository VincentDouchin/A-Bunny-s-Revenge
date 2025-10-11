use reqwest::Client;
use serde::Deserialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_keyring::KeyringExt;
use tauri_plugin_opener::open_url;
use tokio::time::{sleep, Duration};

static CLIENT_ID: &str = "Ov23liFAiWvLFR41eS9o";

#[derive(Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

#[tauri::command]
pub async fn start_github_device_flow(app: AppHandle) -> Result<(), String> {
    let client = Client::new();

    // 1️⃣ Request device code
    let device_code_res: DeviceCodeResponse = client
        .post("https://github.com/login/device/code")
        .header("Accept", "application/json") // <- add this
        .json(&serde_json::json!({ "client_id": CLIENT_ID, "scope": "repo" }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    // 2️⃣ Send user instructions to frontend
    app.emit(
        "device_flow_start",
        serde_json::json!({
            "user_code": device_code_res.user_code,
            "verification_uri": device_code_res.verification_uri
        }),
    )
    .map_err(|e| e.to_string())?;

    // Optionally open browser automatically
    let _ = open_url(device_code_res.verification_uri.clone(), None::<&str>);

    // 3️⃣ Poll for token
    let start = std::time::Instant::now();
    loop {
        if start.elapsed().as_secs() > device_code_res.expires_in {
            app.emit("device_flow_error", "Device code expired").ok();
            return Err("Device code expired".into());
        }

        let token_res = client
            .post("https://github.com/login/oauth/access_token")
            .header("Accept", "application/json")
            .json(&serde_json::json!({
                "client_id": CLIENT_ID,
                "device_code": device_code_res.device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| e.to_string())?;

        if let Some(access_token) = token_res.get("access_token").and_then(|t| t.as_str()) {
            // 4️⃣ Save token in Keyring
            app.keyring()
                .set_password("my-tauri-github-app", "current-user", access_token)
                .map_err(|e| e.to_string())?;

            app.emit("device_flow_success", true).ok();
            break;
        }

        // Wait for next polling interval
        sleep(Duration::from_secs(device_code_res.interval)).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn validate_github_token_command(app: AppHandle) -> Result<(), String> {
    let result = validate_github_token(&app).await.expect("validated token");
    app.emit("login_valid", result)
        .expect("send login_valid event");
    Ok(())
}

async fn validate_github_token(app: &AppHandle) -> Result<bool, String> {
    let token = match app
        .keyring()
        .get_password("my-tauri-github-app", "current-user")
    {
        Ok(Some(t)) => t,
        _ => return Ok(false),
    };

    let client = Client::new();
    let res = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "MyTauriApp") // GitHub requires a User-Agent header
        .send()
        .await;

    match res {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}
