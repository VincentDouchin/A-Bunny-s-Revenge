use tauri::async_runtime::spawn_blocking;

mod auth;
mod git_operations;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_keyring::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            git_operations::clone_repo_command,
            git_operations::pull_latest_command,
            git_operations::commit_and_push,
            auth::start_github_device_flow,
            auth::validate_github_token_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Runs a blocking function in a background thread and maps all errors to `String`.
pub async fn run_async_task<F, T, E>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, E> + Send + 'static,
    T: Send + 'static,
    E: std::fmt::Display + Send + 'static,
{
    spawn_blocking(move || f())
        .await
        .map_err(|e| format!("Thread join error: {}", e))?
        .map_err(|e| e.to_string())
}

#[macro_export]
macro_rules! async_command {
    ($expr:expr) => {{
        run_async_task(move || $expr).await
    }};
}
