use crate::async_command;
use crate::run_async_task;
use git2::IndexAddOption;
use git2::{build::RepoBuilder, Cred, FetchOptions, PushOptions, RemoteCallbacks, Repository};
use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::json;
use std::path::Path;
use std::thread::sleep;
use std::time::Duration;
use std::time::SystemTime;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter};
use tauri_plugin_keyring::KeyringExt;

static REPO_URL: &str = "https://github.com/VincentDouchin/A-Bunny-s-Revenge";

pub fn clone_repo(app: AppHandle, path: &str) -> Result<(), String> {
    let path = Path::new(&path);

    // --- Setup progress callbacks ---
    let mut callbacks = RemoteCallbacks::new();
    let app_handle = app.clone();

    callbacks.transfer_progress(move |progress| {
        if progress.total_objects() > 0 {
            let percent =
                (progress.received_objects() as f64 / progress.total_objects() as f64) * 100.0;
            let _ = app_handle.emit("clone_progress", percent);
        }
        true
    });

    // --- Fetch and clone setup ---
    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut builder = RepoBuilder::new();
    builder.fetch_options(fetch_opts);

    // --- Do the clone ---
    match builder.clone(REPO_URL, path) {
        Ok(_) => {
            let _ = app.emit("clone_progress", 100.0);
            let _ = app.emit("clone_done", "Repository cloned successfully.");
            Ok(())
        }
        Err(e) => {
            let msg = format!("Failed to clone: {}", e);
            let _ = app.emit("clone_error", msg.clone());
            Err(msg)
        }
    }
}

fn pull_latest(repo_path: &str) -> Result<(), git2::Error> {
    let repo = Repository::open(repo_path)?;

    // Setup remote and callbacks
    let mut remote = repo.find_remote("origin")?;

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        Cred::credential_helper(&repo.config()?, repo_path, username_from_url)
    });

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    // Fetch remote main
    remote.fetch(&["main"], Some(&mut fetch_opts), None)?;

    // Merge FETCH_HEAD into local main
    let fetch_head = repo.find_reference("FETCH_HEAD")?;
    let fetch_commit = repo.reference_to_annotated_commit(&fetch_head)?;
    let (analysis, _) = repo.merge_analysis(&[&fetch_commit])?;

    if analysis.is_fast_forward() {
        let mut ref_heads = repo.find_reference("refs/heads/main")?;
        ref_heads.set_target(fetch_commit.id(), "Fast-forward")?;
        repo.set_head("refs/heads/main")?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn pull_latest_command(repo_path: String) -> Result<(), String> {
    async_command!(pull_latest(&repo_path))
}

#[tauri::command]
pub async fn clone_repo_command(app: AppHandle, repo_path: String) -> Result<(), String> {
    async_command!(clone_repo(app, &repo_path))
}

/// Push local changes to GitHub
#[tauri::command]
pub fn commit_and_push(
    app: AppHandle,
    repo_path: String,
    branch: String,
    commit_message: String,
) -> Result<(), String> {
    // 1️⃣ Get token from Keyring
    let token = app
        .keyring()
        .get_password("my-tauri-github-app", "current-user")
        .map_err(|e| e.to_string())?
        .ok_or("No GitHub token found")?;

    // 2️⃣ Open repo
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // 3️⃣ Stage all changes
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    // 4️⃣ Create a commit
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let parent_commit = head.peel_to_commit().map_err(|e| e.to_string())?;

    let sig = repo.signature().map_err(|e| e.to_string())?;
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &commit_message,
        &tree,
        &[&parent_commit],
    )
    .map_err(|e| e.to_string())?;

    // 5️⃣ Push to remote
    let mut callbacks = RemoteCallbacks::new();
    let token_clone = token.clone();
    callbacks.credentials(move |_url, _username_from_url, _allowed_types| {
        git2::Cred::userpass_plaintext("git", &token_clone)
    });

    let mut push_options = PushOptions::new();
    push_options.remote_callbacks(callbacks);

    let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote
        .push(&[&refspec], Some(&mut push_options))
        .map_err(|e| e.to_string())?;

    Ok(())
}

static GITHUB_API: &str = "https://api.github.com";
static REPO_OWNER: &str = "VincentDouchin";
static REPO_NAME: &str = "A-Bunny-s-Revenge";

#[derive(Deserialize)]
struct CreatePrResponse {
    html_url: String,
    number: u64,
}
#[derive(Deserialize)]
struct PrInfo {
    mergeable: Option<bool>,
}

/// Generate a unique branch name like "app/user-1730900123"
fn generate_branch_name(user: &str) -> String {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    format!("app/{user}-{ts}")
}

/// Internal helper: commit changes, push branch, create PR, and merge if possible
fn commit_push_create_and_merge_pr(
    app: AppHandle,
    repo_path: &str,
    commit_message: &str,
    base_branch: &str,
    pr_title: &str,
    pr_body: &str,
) -> Result<String, String> {
    // 1️⃣ Get GitHub token
    let token = app
        .keyring()
        .get_password("my-tauri-github-app", "current-user")
        .map_err(|e| e.to_string())?
        .ok_or("No GitHub token found")?;

    // 2️⃣ Open repo
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    // 3️⃣ Stage all modified files
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    // 4️⃣ Create commit
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let parent_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let sig = repo.signature().map_err(|e| e.to_string())?;

    repo.commit(
        Some("HEAD"),      // update HEAD ref
        &sig,              // author
        &sig,              // committer
        commit_message,    // commit message
        &tree,             // current snapshot
        &[&parent_commit], // parent
    )
    .map_err(|e| e.to_string())?;

    // 5️⃣ Create a new branch for this change
    let branch_name = generate_branch_name("user");
    let commit = repo
        .head()
        .unwrap()
        .peel_to_commit()
        .map_err(|e| e.to_string())?;
    repo.branch(&branch_name, &commit, false)
        .map_err(|e| e.to_string())?;

    // 6️⃣ Push branch to origin
    let mut callbacks = RemoteCallbacks::new();
    let token_clone = token.clone();
    callbacks.credentials(move |_url, _username, _allowed| {
        Cred::userpass_plaintext("x-access-token", &token_clone)
    });
    let mut push_opts = PushOptions::new();
    push_opts.remote_callbacks(callbacks);

    let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;
    let refspec = format!("refs/heads/{0}:refs/heads/{0}", branch_name);
    remote
        .push(&[&refspec], Some(&mut push_opts))
        .map_err(|e| e.to_string())?;

    // 7️⃣ Create PR on GitHub
    let client = Client::new();
    let pr_url = format!("{GITHUB_API}/repos/{REPO_OWNER}/{REPO_NAME}/pulls");

    let create_resp = client
        .post(&pr_url)
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "tauri-app")
        .bearer_auth(&token)
        .json(&json!({
            "title": pr_title,
            "head": branch_name,
            "base": base_branch,
            "body": pr_body
        }))
        .send()
        .map_err(|e| e.to_string())?;

    if !create_resp.status().is_success() {
        let txt = create_resp.text().unwrap_or_default();
        return Err(format!("❌ Failed to create PR: {}", txt));
    }

    let pr: CreatePrResponse = create_resp.json().map_err(|e| e.to_string())?;
    let pr_number = pr.number;

    // 8️⃣ Poll for mergeability
    let pr_info_url = format!("{GITHUB_API}/repos/{REPO_OWNER}/{REPO_NAME}/pulls/{pr_number}");
    let mut attempts = 0;
    let mut mergeable = None;

    while attempts < 10 {
        let resp = client
            .get(&pr_info_url)
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "tauri-app")
            .bearer_auth(&token)
            .send()
            .map_err(|e| e.to_string())?;

        if resp.status().is_success() {
            let info: PrInfo = resp.json().map_err(|e| e.to_string())?;
            if let Some(value) = info.mergeable {
                mergeable = Some(value);
                break;
            }
        }
        attempts += 1;
        sleep(Duration::from_secs(1));
    }

    // 9️⃣ If mergeable, auto-merge the PR
    if mergeable == Some(true) {
        let merge_url =
            format!("{GITHUB_API}/repos/{REPO_OWNER}/{REPO_NAME}/pulls/{pr_number}/merge");
        let merge_resp = client
            .put(&merge_url)
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "tauri-app")
            .bearer_auth(&token)
            .json(&json!({
                "commit_title": format!("Merge PR #{} via Tauri app", pr_number),
                "merge_method": "merge"
            }))
            .send()
            .map_err(|e| e.to_string())?;

        if merge_resp.status().is_success() {
            return Ok(format!(
                "✅ PR merged automatically: {}\nBranch: {}",
                pr.html_url, branch_name
            ));
        } else {
            let txt = merge_resp.text().unwrap_or_default();
            return Ok(format!(
                "⚠️ PR created but could not be merged automatically.\n{} \nReason: {}",
                pr.html_url, txt
            ));
        }
    }

    // 10️⃣ Otherwise, let user manually merge
    Ok(format!(
        "📝 Pull Request created: {}\nAutomatic merge not possible.",
        pr.html_url
    ))
}

/// Tauri command wrapper
#[tauri::command]
pub async fn create_pr_command(
    app: AppHandle,
    repo_path: String,
    commit_message: String,
    base_branch: String,
    pr_title: String,
    pr_body: String,
) -> Result<String, String> {
    async_command!(commit_push_create_and_merge_pr(
        app,
        &repo_path,
        &commit_message,
        &base_branch,
        &pr_title,
        &pr_body
    ))
}
