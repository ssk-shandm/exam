use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager as _;

const DEFAULT_LLM_CONFIG: &str = include_str!("../../config/llm-config.json");

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LlmConfigPayload {
    content: String,
    location: String,
}

fn app_config_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| format!("无法获取应用配置目录：{error}"))
}

fn llm_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_config_directory(app).map(|directory| directory.join("llm-config.txt"))
}

fn legacy_llm_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_config_directory(app).map(|directory| directory.join("llm-config.json"))
}

fn ensure_llm_config_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = llm_config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建配置目录：{error}"))?;
    }

    if !path.exists() {
        let legacy_path = legacy_llm_config_path(app)?;
        if legacy_path.is_file() {
            fs::copy(&legacy_path, &path)
                .map_err(|error| format!("无法迁移旧版 LLM 配置：{error}"))?;
        } else {
            fs::write(&path, DEFAULT_LLM_CONFIG)
                .map_err(|error| format!("无法创建默认 LLM 配置：{error}"))?;
        }
    }

    Ok(path)
}

#[tauri::command]
fn read_llm_config(app: tauri::AppHandle) -> Result<LlmConfigPayload, String> {
    let path = ensure_llm_config_file(&app)?;
    let raw = fs::read_to_string(&path).map_err(|error| format!("无法读取 LLM 配置：{error}"))?;
    let content = raw.strip_prefix('\u{feff}').unwrap_or(&raw).to_owned();
    Ok(LlmConfigPayload {
        content,
        location: path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn write_llm_config(app: tauri::AppHandle, content: String) -> Result<LlmConfigPayload, String> {
    if content.len() > 256 * 1024 {
        return Err("LLM 配置文件不能超过 256 KB".to_string());
    }
    let parsed: serde_json::Value = serde_json::from_str(&content)
        .map_err(|error| format!("LLM 配置不是有效 JSON：{error}"))?;
    let pretty = serde_json::to_string_pretty(&parsed)
        .map_err(|error| format!("无法序列化 LLM 配置：{error}"))?;
    let path = llm_config_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建配置目录：{error}"))?;
    }
    fs::write(&path, format!("{pretty}\n"))
        .map_err(|error| format!("无法保存 LLM 配置：{error}"))?;
    Ok(LlmConfigPayload {
        content: pretty,
        location: path.to_string_lossy().into_owned(),
    })
}

fn open_text_file(path: &Path) -> std::io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        Command::new("notepad.exe").arg(path).spawn()?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg("-e").arg(path).spawn()?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open").arg(path).spawn()?;
    }

    Ok(())
}

#[tauri::command]
fn open_llm_config_file(app: tauri::AppHandle) -> Result<String, String> {
    let path = ensure_llm_config_file(&app)?;
    open_text_file(&path).map_err(|error| format!("无法用文本编辑器打开 LLM 配置：{error}"))?;
    Ok(path.to_string_lossy().into_owned())
}

/// Return the current app version for the "about/update" UI.
#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

fn open_directory(path: &Path) -> std::io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe").arg(path).spawn()?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg(path).spawn()?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open").arg(path).spawn()?;
    }

    Ok(())
}

/// Open the built-in question-bank or image-library directory.
///
/// Development builds point at the repository's `public` directory. Packaged
/// builds point at the `public` directory copied beside the installed app resources.
#[tauri::command]
fn open_content_location(_app: tauri::AppHandle, location: &str) -> Result<String, String> {
    let directory_name = match location {
        "subjects" => "subjects",
        "images" => "images",
        _ => return Err("不支持的资源位置".to_string()),
    };

    #[cfg(debug_assertions)]
    let target = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("public")
        .join(directory_name);

    #[cfg(not(debug_assertions))]
    let target = _app
        .path()
        .resource_dir()
        .map_err(|error| format!("无法获取应用资源目录：{error}"))?
        .join("public")
        .join(directory_name);

    if !target.is_dir() {
        return Err(format!("资源目录不存在：{}", target.display()));
    }

    open_directory(&target).map_err(|error| format!("无法打开资源目录：{error}"))?;
    Ok(target.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            open_content_location,
            read_llm_config,
            write_llm_config,
            open_llm_config_file
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            if let Some(window) = _app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
