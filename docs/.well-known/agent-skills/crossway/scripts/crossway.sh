#!/bin/bash

# Deterministic runtime for the Crossway agent skill.
# This file stays compatible with the macOS system Bash (3.2).

set -u
umask 077

PROGRAM_NAME="crossway.sh"
RESULT_PREFIX="CROSSWAY_RESULT_V1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
NATIVE_ADAPTER="${SCRIPT_DIR}/crossway-native.jxa"
STATE_DIR=""
PREFLIGHT_OUTCOME=""
PREFLIGHT_DETAIL=""
PREFLIGHT_EXIT=20
HOST_OS_VERSION=""
HOST_ARCHITECTURE=""
NATIVE_RESPONSE=""
BUNDLE_ID="com.crossway.CrosswayControl"
TEAM_ID="KV7K3QCSR3"
SYSTEM_TARGET="/Applications/Crossway.app"
USER_HOME="${HOME:-}"
USER_TARGET="${USER_HOME}/Applications/Crossway.app"
SELECTED_TARGET=""
TARGET_REASON=""
TARGET_DUPLICATE_COUNT=0
SYSTEM_RUNNING_COUNT=0
USER_RUNNING_COUNT=0
SYSTEM_RUNNING_PID=""
USER_RUNNING_PID=""
SYSTEM_RUNNING_EXECUTABLE=""
USER_RUNNING_EXECUTABLE=""
UNSAFE_RUNNING_COUNT=0
UNSAFE_RUNNING_DETAIL=""
INSTALLED_STATE="absent"
INSTALLED_VERSION=""
INSTALLED_BUILD=""
INSTALLED_TEAM=""
INSTALLED_SIGNING_ID=""
INSTALLED_CDHASH=""
INSTALLED_DEVELOPER_ID="false"
INSTALLED_RUNNING="false"
INSTALLED_RUNNING_PID=""
INSTALLED_DESIGNATED_REQUIREMENT=""
INSTALLED_FINGERPRINT=""
INSTALLED_TREE_FINGERPRINT="absent"
TREE_FINGERPRINT=""
LATEST_API_URL="https://api.github.com/repos/crossway-app/Crossway-Releases/releases/latest"
GITHUB_API_VERSION="2026-03-10"
MAX_RELEASE_JSON_BYTES=262144
RELEASE_TAG=""
RELEASE_MARKETING_VERSION=""
RELEASE_BUILD=""
RELEASE_ASSET_DIGEST=""
RELEASE_ASSET_SIZE=""
RELEASE_ASSET_URL=""
RELEASE_BODY_DIGEST=""
RELEASE_ERROR_OUTCOME=""
RELEASE_ERROR_DETAIL=""
RELEASE_ERROR_EXIT=30
FETCHED_RELEASE_PATH=""
DOWNLOADED_ARCHIVE_PATH=""
ARCHIVE_ENTRY_COUNT=""
ARCHIVE_EXPANDED_BYTES=""
CANDIDATE_PATH=""
CANDIDATE_VERSION=""
CANDIDATE_BUILD=""
CANDIDATE_MINIMUM_OS=""
CANDIDATE_ARCHITECTURES=""
CANDIDATE_CDHASH=""
CANDIDATE_FINGERPRINT=""
PLANNED_ACTION=""
PROCESS_IMPACT=""
COMPUTED_PLAN_ID=""
EXACT_PROCESS_STATE=""
EXACT_PROCESS_PID=""
LAUNCHED_PROCESS_PID=""
LIFECYCLE_ERROR_OUTCOME=""
LIFECYCLE_ERROR_DETAIL=""
LIFECYCLE_ERROR_EXIT=20
TRANSACTION_PARENT=""
TRANSACTION_LOCK=""
TRANSACTION_STAGE=""
TRANSACTION_ROLLBACK=""
TRANSACTION_JOURNAL=""
TRANSACTION_LOCK_OWNER=""
TRANSACTION_ERROR_OUTCOME=""
TRANSACTION_ERROR_DETAIL=""
TRANSACTION_ERROR_EXIT=20
EXECUTION_OUTCOME=""
EXECUTION_DETAIL=""
EXECUTION_EXIT=2
TARGET_PARENT_CREATED="false"
RECOVERY_PHASE=""
RECOVERY_PRIOR_FINGERPRINT=""
RECOVERY_PRIOR_TREE_FINGERPRINT=""
RECOVERY_CANDIDATE_FINGERPRINT=""
RECOVERY_PRIOR_RUNNING="false"
RECOVERY_PRIOR_PID=""
RECOVERY_HANDLED="false"
RECOVERY_EXIT=0
RECOVERY_OUTCOME=""
RECOVERY_DETAIL=""
RECOVERY_VERSION=""
RECOVERY_BUILD=""
RECOVERY_OBJECT_STATE=""
RECOVERY_JOURNAL_FINGERPRINT=""
ACTIVE_COMMAND=""
DIAGNOSIS_CODE=""
DIAGNOSIS_DETAIL=""
REPAIR_REASON=""
QUIT_POLL_ATTEMPTS=25
LAUNCH_POLL_ATTEMPTS=50
HEALTH_GRACE_POLLS=10
PINNED_CODE_REQUIREMENT='anchor apple generic and identifier "com.crossway.CrosswayControl" and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = "KV7K3QCSR3"'

REQUIRED_TOOLS="
/bin/bash
/bin/chmod
/bin/mkdir
/bin/mv
/bin/rm
/bin/sleep
/bin/rmdir
/usr/bin/base64
/usr/bin/codesign
/usr/bin/curl
/usr/bin/ditto
/usr/bin/dirname
/usr/bin/find
/usr/bin/grep
/usr/bin/head
/usr/bin/mdfind
/usr/bin/mktemp
/usr/bin/open
/usr/bin/osascript
/usr/bin/plutil
/usr/bin/readlink
/usr/bin/shasum
/usr/bin/sed
/usr/bin/stat
/usr/bin/sw_vers
/usr/bin/tr
/usr/bin/tail
/usr/bin/uname
/usr/bin/unzip
/usr/bin/wc
/usr/bin/xattr
/usr/sbin/spctl
"

usage() {
  /usr/bin/printf '%s\n' \
    "Usage:" \
    "  ${PROGRAM_NAME} diagnose [--target <canonical-path>]" \
    "  ${PROGRAM_NAME} plan [--target <canonical-path>]" \
    "  ${PROGRAM_NAME} apply --expected-plan-id <sha256> --confirmed [--target <canonical-path>]" \
    "  ${PROGRAM_NAME} --help"
}

percent_encode() {
  local input="$1"
  local output=""
  local byte=""
  local hex=""
  local index=0

  LC_ALL=C
  while [ "$index" -lt "${#input}" ]; do
    byte="${input:$index:1}"
    case "$byte" in
      [A-Za-z0-9._~-]) output="${output}${byte}" ;;
      *)
        printf -v hex '%02X' "'$byte"
        output="${output}%${hex}"
        ;;
    esac
    index=$((index + 1))
  done

  /usr/bin/printf '%s' "$output"
}

base64_encode() {
  /usr/bin/printf '%s' "$1" | /usr/bin/base64 | /usr/bin/tr -d '\r\n'
}

emit_result() {
  local outcome="$1"
  local action="$2"
  local target="$3"
  local version="$4"
  local release="$5"
  local permission_state="$6"
  local plan_id="$7"
  local detail="$8"

  /usr/bin/printf '%s outcome=%s action=%s target=%s version=%s release=%s permission_state=%s plan_id=%s detail=%s\n' \
    "$RESULT_PREFIX" \
    "$(percent_encode "$outcome")" \
    "$(percent_encode "$action")" \
    "$(percent_encode "$target")" \
    "$(percent_encode "$version")" \
    "$(percent_encode "$release")" \
    "$(percent_encode "$permission_state")" \
    "$(percent_encode "$plan_id")" \
    "$(percent_encode "$detail")"
}

finish() {
  local exit_code="$1"
  shift
  emit_result "$@"
  exit "$exit_code"
}

usage_error() {
  local action="$1"
  local target="$2"
  local detail="$3"
  /usr/bin/printf '%s: %s\n' "$PROGRAM_NAME" "$detail" >&2
  usage >&2
  finish 2 "usage_error" "$action" "$target" "" "" "" "" "$detail"
}

set_preflight_failure() {
  PREFLIGHT_EXIT="$1"
  PREFLIGHT_OUTCOME="$2"
  PREFLIGHT_DETAIL="$3"
  return 1
}

cleanup_private_state() {
  if [ -z "$STATE_DIR" ]; then
    return 0
  fi

  case "$STATE_DIR" in
    */crossway-agent.[A-Za-z0-9][A-Za-z0-9]*)
      if [ -d "$STATE_DIR" ] && [ ! -L "$STATE_DIR" ]; then
        /bin/rm -rf -- "$STATE_DIR"
      fi
      ;;
    *)
      /usr/bin/printf '%s: refusing to clean unexpected private-state path: %s\n' \
        "$PROGRAM_NAME" "$STATE_DIR" >&2
      ;;
  esac
  STATE_DIR=""
}

create_private_state() {
  local temp_parent="${TMPDIR:-/private/tmp}"
  local mode=""

  case "$temp_parent" in
    /*) ;;
    *)
      set_preflight_failure 20 "host_capability_required" \
        "Temporary directory must be an absolute path"
      return 1
      ;;
  esac

  STATE_DIR="$(/usr/bin/mktemp -d "${temp_parent%/}/crossway-agent.XXXXXXXX" 2>/dev/null)" || {
    STATE_DIR=""
    set_preflight_failure 20 "host_capability_required" \
      "Allow the helper to create a private temporary directory"
    return 1
  }

  if [ -L "$STATE_DIR" ] || ! /bin/chmod 700 "$STATE_DIR" 2>/dev/null; then
    set_preflight_failure 20 "host_capability_required" \
      "Allow the helper to secure its private temporary directory"
    return 1
  fi

  mode="$(/usr/bin/stat -f '%Lp' "$STATE_DIR" 2>/dev/null)" || mode=""
  if [ "$mode" != "700" ]; then
    set_preflight_failure 20 "host_capability_required" \
      "Private temporary directory permissions could not be verified"
    return 1
  fi
}

validate_json_document() {
  local document="$1"
  if [ -z "$document" ]; then
    return 1
  fi
  case "$document" in
    *$'\n'*) return 1 ;;
  esac
  /usr/bin/printf '%s' "$document" | \
    /usr/bin/plutil -convert json -o /dev/null -- - >/dev/null 2>&1
}

native_request() {
  local request="$1"
  local response=""
  local stderr_path="${STATE_DIR}/native-adapter.stderr"
  local native_exit=0

  NATIVE_RESPONSE=""

  if ! validate_json_document "$request"; then
    PREFLIGHT_DETAIL="Native adapter request was not valid single-line JSON"
    return 2
  fi
  if [ -z "$STATE_DIR" ] || [ ! -d "$STATE_DIR" ] || [ -L "$STATE_DIR" ]; then
    PREFLIGHT_DETAIL="Private state is unavailable for the native adapter"
    return 2
  fi

  response="$(/usr/bin/osascript -l JavaScript "$NATIVE_ADAPTER" "$request" \
    2>"$stderr_path")" || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    PREFLIGHT_DETAIL="Allow the local agent to run the bundled macOS inspection adapter"
    return 20
  fi
  if ! validate_json_document "$response"; then
    PREFLIGHT_DETAIL="Native adapter returned malformed JSON"
    return 2
  fi

  NATIVE_RESPONSE="$response"
  case "$response" in
    '{"ok":true,'*) ;;
    '{"ok":false,'*)
      PREFLIGHT_DETAIL="Native adapter rejected its strict request contract"
      return 2
      ;;
    *)
      PREFLIGHT_DETAIL="Native adapter returned an unknown response contract"
      return 2
      ;;
  esac

  return 0
}

native_canonicalize_path() {
  local path_b64=""
  path_b64="$(base64_encode "$1")" || return 2
  native_request "{\"version\":1,\"action\":\"canonicalize_path\",\"pathB64\":\"${path_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_read_bundle_info() {
  local path_b64=""
  path_b64="$(base64_encode "$1")" || return 2
  native_request "{\"version\":1,\"action\":\"read_bundle_info\",\"pathB64\":\"${path_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_running_applications() {
  local bundle_id_b64=""
  bundle_id_b64="$(base64_encode "$1")" || return 2
  native_request "{\"version\":1,\"action\":\"running_applications\",\"bundleIdB64\":\"${bundle_id_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_parse_release_file() {
  local path_b64=""
  path_b64="$(base64_encode "$1")" || return 2
  native_request "{\"version\":1,\"action\":\"parse_release_file\",\"pathB64\":\"${path_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_compare_versions() {
  local left_short_b64=""
  local left_build_b64=""
  local right_short_b64=""
  local right_build_b64=""
  left_short_b64="$(base64_encode "$1")" || return 2
  left_build_b64="$(base64_encode "$2")" || return 2
  right_short_b64="$(base64_encode "$3")" || return 2
  right_build_b64="$(base64_encode "$4")" || return 2
  native_request "{\"version\":1,\"action\":\"compare_versions\",\"leftShortB64\":\"${left_short_b64}\",\"leftBuildB64\":\"${left_build_b64}\",\"rightShortB64\":\"${right_short_b64}\",\"rightBuildB64\":\"${right_build_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_validate_zip_file() {
  local path_b64=""
  path_b64="$(base64_encode "$1")" || return 2
  native_request "{\"version\":1,\"action\":\"validate_zip_file\",\"pathB64\":\"${path_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_read_macho_architectures() {
  local path_b64=""
  path_b64="$(base64_encode "$1")" || return 2
  native_request "{\"version\":1,\"action\":\"read_macho_architectures\",\"pathB64\":\"${path_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_process_details() {
  native_request "{\"version\":1,\"action\":\"process_details\",\"pid\":$1}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_terminate_exact_process() {
  local bundle_id_b64=""
  local bundle_path_b64=""
  bundle_id_b64="$(base64_encode "$2")" || return 2
  bundle_path_b64="$(base64_encode "$3")" || return 2
  native_request "{\"version\":1,\"action\":\"terminate_exact_process\",\"pid\":$1,\"bundleIdB64\":\"${bundle_id_b64}\",\"bundlePathB64\":\"${bundle_path_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_write_transaction_journal() {
  local journal_b64="" target_b64="" stage_b64="" rollback_b64=""
  local installed_fingerprint_b64="" installed_tree_fingerprint_b64=""
  local candidate_fingerprint_b64=""
  local prior_pid="null"
  journal_b64="$(base64_encode "$TRANSACTION_JOURNAL")" || return 2
  target_b64="$(base64_encode "$SELECTED_TARGET")" || return 2
  stage_b64="$(base64_encode "$TRANSACTION_STAGE")" || return 2
  rollback_b64="$(base64_encode "$TRANSACTION_ROLLBACK")" || return 2
  installed_fingerprint_b64="$(base64_encode "$INSTALLED_FINGERPRINT")" || return 2
  installed_tree_fingerprint_b64="$(base64_encode "$INSTALLED_TREE_FINGERPRINT")" || return 2
  candidate_fingerprint_b64="$(base64_encode "$CANDIDATE_FINGERPRINT")" || return 2
  if [ "$INSTALLED_RUNNING" = "true" ]; then
    prior_pid="$INSTALLED_RUNNING_PID"
  fi
  native_request "{\"version\":1,\"action\":\"write_transaction_journal\",\"journalPathB64\":\"${journal_b64}\",\"targetPathB64\":\"${target_b64}\",\"stagePathB64\":\"${stage_b64}\",\"rollbackPathB64\":\"${rollback_b64}\",\"installedFingerprintB64\":\"${installed_fingerprint_b64}\",\"installedTreeFingerprintB64\":\"${installed_tree_fingerprint_b64}\",\"candidateFingerprintB64\":\"${candidate_fingerprint_b64}\",\"priorRunning\":${INSTALLED_RUNNING},\"priorPid\":${prior_pid},\"phase\":\"$1\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_read_transaction_journal() {
  local journal_b64=""
  journal_b64="$(base64_encode "$1")" || return 2
  native_request "{\"version\":1,\"action\":\"read_transaction_journal\",\"journalPathB64\":\"${journal_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

native_sync_transaction_parent() {
  local parent_b64=""
  parent_b64="$(base64_encode "$TRANSACTION_PARENT")" || return 2
  native_request "{\"version\":1,\"action\":\"sync_transaction_parent\",\"parentPathB64\":\"${parent_b64}\"}" || return $?
  /usr/bin/printf '%s\n' "$NATIVE_RESPONSE"
}

json_extract_raw() {
  local document="$1"
  local key_path="$2"
  /usr/bin/printf '%s' "$document" | \
    /usr/bin/plutil -extract "$key_path" raw -o - -- - 2>/dev/null
}

json_extract_optional_raw() {
  local value=""
  value="$(json_extract_raw "$1" "$2")" || value=""
  if [ "$value" = "null" ]; then
    value=""
  fi
  /usr/bin/printf '%s' "$value"
}

host_preflight() {
  local tool=""
  local os_major=""
  local native_response=""
  local native_exit=0

  PREFLIGHT_OUTCOME=""
  PREFLIGHT_DETAIL=""
  PREFLIGHT_EXIT=20

  if [ "$(/usr/bin/uname -s 2>/dev/null)" != "Darwin" ]; then
    set_preflight_failure 20 "host_capability_required" \
      "Run this skill from a local macOS host"
    return 1
  fi
  case "$USER_HOME" in
    /*) ;;
    *)
      set_preflight_failure 20 "host_capability_required" \
        "The local user's home directory could not be determined"
      return 1
      ;;
  esac

  for tool in $REQUIRED_TOOLS; do
    if [ ! -x "$tool" ]; then
      set_preflight_failure 20 "host_capability_required" \
        "Required macOS tool is unavailable: ${tool}"
      return 1
    fi
  done
  if [ ! -r "$NATIVE_ADAPTER" ]; then
    set_preflight_failure 20 "host_capability_required" \
      "Bundled native adapter is missing or unreadable"
    return 1
  fi

  HOST_OS_VERSION="$(/usr/bin/sw_vers -productVersion 2>/dev/null)" || HOST_OS_VERSION=""
  os_major="${HOST_OS_VERSION%%.*}"
  case "$os_major" in
    ''|*[!0-9]*)
      set_preflight_failure 20 "host_capability_required" \
        "macOS version could not be determined"
      return 1
      ;;
  esac
  if [ "$os_major" -lt 14 ]; then
    set_preflight_failure 40 "incompatible_os" \
      "Crossway requires macOS 14 or later"
    return 1
  fi

  HOST_ARCHITECTURE="$(/usr/bin/uname -m 2>/dev/null)" || HOST_ARCHITECTURE=""
  case "$HOST_ARCHITECTURE" in
    arm64|x86_64) ;;
    *)
      set_preflight_failure 20 "host_capability_required" \
        "Host architecture could not be determined"
      return 1
      ;;
  esac

  if ! create_private_state; then
    return 1
  fi

  native_request '{"version":1,"action":"ping"}' || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_preflight_failure 20 "host_capability_required" "$PREFLIGHT_DETAIL"
    else
      set_preflight_failure 2 "internal_invariant_failed" "$PREFLIGHT_DETAIL"
    fi
    return 1
  fi
  native_response="$NATIVE_RESPONSE"
  case "$native_response" in
    *'"adapterVersion":1'*) ;;
    *)
      set_preflight_failure 2 "internal_invariant_failed" \
        "Native adapter version did not match the helper"
      return 1
      ;;
  esac

  # Network and app launch are deliberately not exercised during read-only
  # preflight. Their fixed system clients were verified above; later commands
  # classify an actual denial at the point of use.
  return 0
}

is_canonical_target_string() {
  [ "$1" = "$SYSTEM_TARGET" ] || [ "$1" = "$USER_TARGET" ]
}

path_has_symlink_component() {
  local current="$1"
  local parent=""

  while [ "$current" != "/" ]; do
    if [ -L "$current" ]; then
      return 0
    fi
    parent="$(/usr/bin/dirname "$current")" || return 0
    if [ "$parent" = "$current" ]; then
      return 0
    fi
    current="$parent"
  done
  return 1
}

normalize_explicit_target() {
  local requested="$1"
  local response=""
  local standardized=""
  local resolved=""

  local native_exit=0
  native_canonicalize_path "$requested" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      return 20
    fi
    PREFLIGHT_DETAIL="Target path did not match the native adapter contract"
    return 10
  fi
  response="$NATIVE_RESPONSE"
  standardized="$(json_extract_optional_raw "$response" 'result.standardizedPath')"
  resolved="$(json_extract_optional_raw "$response" 'result.resolvedPath')"
  if ! is_canonical_target_string "$standardized"; then
    PREFLIGHT_DETAIL="Target must be /Applications/Crossway.app or the current user's ~/Applications/Crossway.app"
    return 10
  fi
  if [ "$standardized" != "$resolved" ] || path_has_symlink_component "$standardized"; then
    PREFLIGHT_DETAIL="Target or one of its parent directories is a symbolic link"
    return 10
  fi
  SELECTED_TARGET="$standardized"
  return 0
}

choose_target_from_state() {
  local explicit_target="$1"
  local system_exists="$2"
  local user_exists="$3"
  local system_running="$4"
  local user_running="$5"
  local system_writable="$6"

  SELECTED_TARGET=""
  TARGET_REASON=""
  TARGET_DUPLICATE_COUNT=$((system_exists + user_exists))

  if [ -n "$explicit_target" ]; then
    SELECTED_TARGET="$explicit_target"
    TARGET_REASON="explicit"
    return 0
  fi

  if [ "$system_running" -gt 0 ] && [ "$user_running" -eq 0 ]; then
    SELECTED_TARGET="$SYSTEM_TARGET"
    TARGET_REASON="unique-running"
    return 0
  fi
  if [ "$user_running" -gt 0 ] && [ "$system_running" -eq 0 ]; then
    SELECTED_TARGET="$USER_TARGET"
    TARGET_REASON="unique-running"
    return 0
  fi
  if [ "$system_running" -gt 0 ] && [ "$user_running" -gt 0 ]; then
    PREFLIGHT_DETAIL="Crossway is running from both canonical install locations"
    return 10
  fi

  if [ "$system_exists" -eq 1 ] && [ "$user_exists" -eq 1 ]; then
    PREFLIGHT_DETAIL="Choose /Applications/Crossway.app or ~/Applications/Crossway.app"
    return 10
  fi
  if [ "$system_exists" -eq 1 ]; then
    SELECTED_TARGET="$SYSTEM_TARGET"
    TARGET_REASON="unique-installed"
    return 0
  fi
  if [ "$user_exists" -eq 1 ]; then
    SELECTED_TARGET="$USER_TARGET"
    TARGET_REASON="unique-installed"
    return 0
  fi

  if [ "$system_writable" -eq 1 ]; then
    SELECTED_TARGET="$SYSTEM_TARGET"
  else
    SELECTED_TARGET="$USER_TARGET"
  fi
  TARGET_REASON="new-install-proposal"
  return 0
}

canonical_target_exists() {
  if [ -e "$1" ] || [ -L "$1" ]; then
    /usr/bin/printf '1'
  else
    /usr/bin/printf '0'
  fi
}

system_target_parent_writable() {
  if [ -d "/Applications" ] && [ -w "/Applications" ]; then
    /usr/bin/printf '1'
  else
    /usr/bin/printf '0'
  fi
}

enumerate_running_crossways() {
  local bundle_id_b64=""
  local response=""
  local count=0
  local index=0
  local bundle_path=""
  local resolved_path=""
  local executable_path=""
  local pid=""
  local safe_path=""

  SYSTEM_RUNNING_COUNT=0
  USER_RUNNING_COUNT=0
  SYSTEM_RUNNING_PID=""
  USER_RUNNING_PID=""
  SYSTEM_RUNNING_EXECUTABLE=""
  USER_RUNNING_EXECUTABLE=""
  UNSAFE_RUNNING_COUNT=0
  UNSAFE_RUNNING_DETAIL=""

  bundle_id_b64="$(base64_encode "$BUNDLE_ID")" || return 2
  native_request "{\"version\":1,\"action\":\"running_applications\",\"bundleIdB64\":\"${bundle_id_b64}\"}" || return $?
  response="$NATIVE_RESPONSE"
  count="$(json_extract_raw "$response" 'result.applications')" || return 2
  case "$count" in
    ''|*[!0-9]*) return 2 ;;
  esac

  while [ "$index" -lt "$count" ]; do
    bundle_path="$(json_extract_optional_raw "$response" "result.applications.${index}.standardizedBundlePath")"
    resolved_path="$(json_extract_optional_raw "$response" "result.applications.${index}.resolvedBundlePath")"
    executable_path="$(json_extract_optional_raw "$response" "result.applications.${index}.executablePath")"
    pid="$(json_extract_optional_raw "$response" "result.applications.${index}.pid")"
    safe_path=""

    if [ -n "$bundle_path" ] && [ "$bundle_path" = "$resolved_path" ]; then
      if is_canonical_target_string "$bundle_path" && ! path_has_symlink_component "$bundle_path"; then
        case "$executable_path" in
          "$bundle_path"/Contents/MacOS/*) safe_path="$bundle_path" ;;
        esac
      fi
    fi

    case "$safe_path" in
      "$SYSTEM_TARGET")
        SYSTEM_RUNNING_COUNT=$((SYSTEM_RUNNING_COUNT + 1))
        SYSTEM_RUNNING_PID="$pid"
        SYSTEM_RUNNING_EXECUTABLE="$executable_path"
        ;;
      "$USER_TARGET")
        USER_RUNNING_COUNT=$((USER_RUNNING_COUNT + 1))
        USER_RUNNING_PID="$pid"
        USER_RUNNING_EXECUTABLE="$executable_path"
        ;;
      *)
        UNSAFE_RUNNING_COUNT=$((UNSAFE_RUNNING_COUNT + 1))
        if [ -z "$UNSAFE_RUNNING_DETAIL" ]; then
          UNSAFE_RUNNING_DETAIL="pid=${pid:-unknown},path=${bundle_path:-unknown}"
        fi
        ;;
    esac
    index=$((index + 1))
  done
}

inspect_installed_target() {
  local target="$1"
  local path_b64=""
  local response=""
  local identifier=""
  local codesign_output=""
  local requirement_output=""
  local signature_exit=0
  local native_exit=0

  INSTALLED_STATE="absent"
  INSTALLED_VERSION=""
  INSTALLED_BUILD=""
  INSTALLED_TEAM=""
  INSTALLED_SIGNING_ID=""
  INSTALLED_CDHASH=""
  INSTALLED_DEVELOPER_ID="false"
  INSTALLED_RUNNING="false"
  INSTALLED_RUNNING_PID=""
  INSTALLED_DESIGNATED_REQUIREMENT=""
  INSTALLED_FINGERPRINT=""
  INSTALLED_TREE_FINGERPRINT="absent"

  if [ "$target" = "$SYSTEM_TARGET" ] && [ "$SYSTEM_RUNNING_COUNT" -eq 1 ]; then
    INSTALLED_RUNNING="true"
    INSTALLED_RUNNING_PID="$SYSTEM_RUNNING_PID"
  elif [ "$target" = "$USER_TARGET" ] && [ "$USER_RUNNING_COUNT" -eq 1 ]; then
    INSTALLED_RUNNING="true"
    INSTALLED_RUNNING_PID="$USER_RUNNING_PID"
  fi

  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    return 0
  fi
  if [ -L "$target" ] || path_has_symlink_component "$target" || [ ! -d "$target" ]; then
    INSTALLED_STATE="wrong_identity"
    return 0
  fi

  path_b64="$(base64_encode "$target")" || return 2
  native_request "{\"version\":1,\"action\":\"read_bundle_info\",\"pathB64\":\"${path_b64}\"}" || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    case "$NATIVE_RESPONSE" in
      *'"code":"plist_unreadable"'*)
        INSTALLED_STATE="wrong_identity"
        return 0
        ;;
    esac
    return "$native_exit"
  fi
  response="$NATIVE_RESPONSE"
  identifier="$(json_extract_optional_raw "$response" 'result.bundleIdentifier')"
  INSTALLED_VERSION="$(json_extract_optional_raw "$response" 'result.shortVersion')"
  INSTALLED_BUILD="$(json_extract_optional_raw "$response" 'result.buildVersion')"
  if [ "$identifier" != "$BUNDLE_ID" ]; then
    INSTALLED_STATE="wrong_identity"
    return 0
  fi

  /usr/bin/codesign --verify --strict --deep "$target" >/dev/null 2>"${STATE_DIR}/installed-codesign-verify.stderr" || signature_exit=$?
  if [ "$signature_exit" -ne 0 ]; then
    if /usr/bin/grep -Eiq 'operation not permitted|sandbox|deny|denied' \
      "${STATE_DIR}/installed-codesign-verify.stderr"; then
      PREFLIGHT_DETAIL="Allow the local agent to inspect the installed Crossway signature"
      return 20
    fi
    INSTALLED_STATE="damaged_expected_identity"
    return 0
  fi

  codesign_output="$(/usr/bin/codesign -dv --verbose=4 "$target" 2>&1)" || {
    PREFLIGHT_DETAIL="Allow the local agent to inspect the installed Crossway identity"
    return 20
  }
  INSTALLED_TEAM="$(/usr/bin/printf '%s\n' "$codesign_output" | \
    /usr/bin/sed -n 's/^TeamIdentifier=//p' | /usr/bin/head -1)"
  INSTALLED_SIGNING_ID="$(/usr/bin/printf '%s\n' "$codesign_output" | \
    /usr/bin/sed -n 's/^Identifier=//p' | /usr/bin/head -1)"
  INSTALLED_CDHASH="$(/usr/bin/printf '%s\n' "$codesign_output" | \
    /usr/bin/sed -n 's/^CDHash=//p' | /usr/bin/head -1)"
  if /usr/bin/printf '%s\n' "$codesign_output" | \
    /usr/bin/grep -q '^Authority=Developer ID Application:'; then
    INSTALLED_DEVELOPER_ID="true"
  fi
  if [ "$INSTALLED_TEAM" != "$TEAM_ID" ] || \
    [ "$INSTALLED_SIGNING_ID" != "$BUNDLE_ID" ] || \
    [ "$INSTALLED_DEVELOPER_ID" != "true" ] || \
    ! /usr/bin/printf '%s\n' "$INSTALLED_CDHASH" | \
      /usr/bin/grep -Eq '^[a-f0-9]{40}$'; then
    INSTALLED_STATE="wrong_identity"
    return 0
  fi
  requirement_output="$(/usr/bin/codesign -d -r- "$target" 2>&1)" || {
    PREFLIGHT_DETAIL="Allow the local agent to read the installed Crossway requirement"
    return 20
  }
  INSTALLED_DESIGNATED_REQUIREMENT="$(/usr/bin/printf '%s\n' "$requirement_output" | \
    /usr/bin/sed -n 's/^[[:space:]]*designated => //p' | /usr/bin/head -1)"
  if [ -z "$INSTALLED_DESIGNATED_REQUIREMENT" ]; then
    PREFLIGHT_DETAIL="Installed Crossway omitted its designated requirement"
    return 2
  fi
  INSTALLED_STATE="valid"
}

report_spotlight_diagnostics() {
  local path=""
  local count=0
  /usr/bin/mdfind "kMDItemCFBundleIdentifier == '${BUNDLE_ID}'" 2>/dev/null | \
    while IFS= read -r path; do
      count=$((count + 1))
      if [ "$count" -le 20 ]; then
        /usr/bin/printf '%s: diagnostic Spotlight match (never auto-selected): %s\n' \
          "$PROGRAM_NAME" "$path" >&2
      fi
    done
}

set_release_failure() {
  RELEASE_ERROR_EXIT="$1"
  RELEASE_ERROR_OUTCOME="$2"
  RELEASE_ERROR_DETAIL="$3"
  return 1
}

classify_latest_http() {
  local status="$1"
  local rate_remaining="$2"
  case "$status" in
    200) return 0 ;;
    403|429)
      if [ "$status" = "429" ] || [ "$rate_remaining" = "0" ]; then
        set_release_failure 30 "github_rate_limited" \
          "GitHub rate-limited the public latest-release request"
        return 1
      fi
      ;;
  esac
  set_release_failure 30 "source_unavailable" \
    "GitHub latest-release request returned HTTP ${status:-unknown}"
  return 1
}

fetch_latest_release() {
  local response_path="${STATE_DIR}/latest-release.json"
  local headers_path="${STATE_DIR}/latest-release.headers"
  local curl_stderr="${STATE_DIR}/latest-release.stderr"
  local transport=""
  local curl_exit=0
  local http_code=""
  local effective_url=""
  local rate_remaining=""
  local response_size=""

  FETCHED_RELEASE_PATH=""

  transport="$(/usr/bin/curl \
    --silent --show-error --location \
    --proto '=https' --proto-redir '=https' \
    --connect-timeout 10 --max-time 30 \
    --retry 2 --retry-delay 1 --retry-connrefused \
    --max-filesize "$MAX_RELEASE_JSON_BYTES" \
    --header 'Accept: application/vnd.github+json' \
    --header "X-GitHub-Api-Version: ${GITHUB_API_VERSION}" \
    --header 'Cache-Control: no-cache' \
    --header 'Pragma: no-cache' \
    --dump-header "$headers_path" \
    --output "$response_path" \
    --write-out $'%{http_code}\n%{url_effective}' \
    "$LATEST_API_URL" 2>"$curl_stderr")" || curl_exit=$?

  if [ "$curl_exit" -ne 0 ]; then
    if /usr/bin/grep -Eiq 'operation not permitted|sandbox|deny|denied' "$curl_stderr"; then
      set_release_failure 20 "host_capability_required" \
        "Allow HTTPS access to api.github.com for the latest Crossway release"
    else
      set_release_failure 30 "source_unavailable" \
        "The latest Crossway release could not be fetched from GitHub"
    fi
    return 1
  fi

  http_code="${transport%%$'\n'*}"
  effective_url="${transport#*$'\n'}"
  rate_remaining="$(/usr/bin/sed -n 's/^[Xx]-[Rr]atelimit-[Rr]emaining:[[:space:]]*//p' \
    "$headers_path" | /usr/bin/tr -d '\r' | /usr/bin/tail -1)"
  if ! classify_latest_http "$http_code" "$rate_remaining"; then
    return 1
  fi
  if [ "$effective_url" != "$LATEST_API_URL" ]; then
    set_release_failure 40 "release_rejected" \
      "GitHub latest-release metadata redirected to an unexpected URL"
    return 1
  fi
  if [ ! -f "$response_path" ] || [ -L "$response_path" ]; then
    set_release_failure 30 "source_unavailable" \
      "GitHub latest-release response was not a regular file"
    return 1
  fi
  response_size="$(/usr/bin/stat -f '%z' "$response_path" 2>/dev/null)" || response_size=""
  case "$response_size" in
    ''|*[!0-9]*)
      set_release_failure 30 "source_unavailable" \
        "GitHub latest-release response size could not be verified"
      return 1
      ;;
  esac
  if [ "$response_size" -eq 0 ] || [ "$response_size" -gt "$MAX_RELEASE_JSON_BYTES" ]; then
    set_release_failure 40 "release_rejected" \
      "GitHub latest-release response exceeded the accepted size"
    return 1
  fi
  FETCHED_RELEASE_PATH="$response_path"
  return 0
}

parse_release_response_file() {
  local response_file="$1"
  local native_exit=0
  local response=""

  RELEASE_TAG=""
  RELEASE_MARKETING_VERSION=""
  RELEASE_BUILD=""
  RELEASE_ASSET_DIGEST=""
  RELEASE_ASSET_SIZE=""
  RELEASE_ASSET_URL=""
  RELEASE_BODY_DIGEST=""

  native_parse_release_file "$response_file" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_release_failure 20 "host_capability_required" "$PREFLIGHT_DETAIL"
    else
      set_release_failure 40 "release_rejected" \
        "GitHub latest-release metadata failed the strict Crossway contract"
    fi
    return 1
  fi

  response="$NATIVE_RESPONSE"
  RELEASE_TAG="$(json_extract_optional_raw "$response" 'result.tag')"
  RELEASE_MARKETING_VERSION="$(json_extract_optional_raw "$response" 'result.marketingVersion')"
  RELEASE_BUILD="$(json_extract_optional_raw "$response" 'result.build')"
  RELEASE_ASSET_DIGEST="$(json_extract_optional_raw "$response" 'result.assetDigest')"
  RELEASE_ASSET_SIZE="$(json_extract_optional_raw "$response" 'result.assetSize')"
  RELEASE_ASSET_URL="$(json_extract_optional_raw "$response" 'result.assetUrl')"
  RELEASE_BODY_DIGEST="$(json_extract_optional_raw "$response" 'result.bodyDigest')"
  if [ -z "$RELEASE_TAG" ] || [ -z "$RELEASE_MARKETING_VERSION" ] || \
    [ -z "$RELEASE_BUILD" ] || [ -z "$RELEASE_ASSET_DIGEST" ] || \
    [ -z "$RELEASE_ASSET_SIZE" ] || [ -z "$RELEASE_ASSET_URL" ]; then
    set_release_failure 40 "release_rejected" \
      "GitHub latest-release metadata omitted a required Crossway field"
    return 1
  fi
  return 0
}

resolve_latest_release() {
  local response_file=""

  RELEASE_ERROR_EXIT=30
  RELEASE_ERROR_OUTCOME=""
  RELEASE_ERROR_DETAIL=""
  fetch_latest_release || return 1
  response_file="$FETCHED_RELEASE_PATH"
  parse_release_response_file "$response_file"
}

compare_release_versions() {
  local response=""
  local native_exit=0

  native_compare_versions "$1" "$2" "$3" "$4" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    return "$native_exit"
  fi
  response="$NATIVE_RESPONSE"
  json_extract_raw "$response" 'result.order'
}

ensure_release_not_older() {
  local order=""

  order="$(compare_release_versions "$1" "$2" "$3" "$4")" || {
    set_release_failure 40 "release_rejected" \
      "Installed or published Crossway version metadata is invalid"
    return 1
  }
  case "$order" in
    -1|0) return 0 ;;
    1)
      set_release_failure 40 "downgrade_refused" \
        "The installed Crossway version is newer than the latest published version"
      return 1
      ;;
    *)
      set_release_failure 40 "release_rejected" \
        "Crossway version comparison returned an invalid result"
      return 1
      ;;
  esac
}

download_release_asset() {
  local archive_path="${STATE_DIR}/Crossway.zip"
  local headers_path="${STATE_DIR}/asset-download.headers"
  local curl_stderr="${STATE_DIR}/asset-download.stderr"
  local transport=""
  local curl_exit=0
  local http_code=""
  local effective_url=""

  DOWNLOADED_ARCHIVE_PATH=""
  transport="$(/usr/bin/curl \
    --silent --show-error --location \
    --proto '=https' --proto-redir '=https' \
    --connect-timeout 10 --max-time 120 \
    --retry 2 --retry-delay 1 --retry-connrefused \
    --max-filesize "$RELEASE_ASSET_SIZE" \
    --header 'Accept: application/octet-stream' \
    --dump-header "$headers_path" \
    --output "$archive_path" \
    --write-out $'%{http_code}\n%{url_effective}' \
    "$RELEASE_ASSET_URL" 2>"$curl_stderr")" || curl_exit=$?
  if [ "$curl_exit" -ne 0 ]; then
    if /usr/bin/grep -Eiq 'operation not permitted|sandbox|deny|denied' "$curl_stderr"; then
      set_release_failure 20 "host_capability_required" \
        "Allow HTTPS access to download the selected Crossway release"
    else
      set_release_failure 30 "download_failed" \
        "The selected Crossway release could not be downloaded"
    fi
    return 1
  fi
  http_code="${transport%%$'\n'*}"
  effective_url="${transport#*$'\n'}"
  if [ "$http_code" != "200" ]; then
    set_release_failure 30 "download_failed" \
      "The Crossway release download returned HTTP ${http_code:-unknown}"
    return 1
  fi
  case "$effective_url" in
    https://*) ;;
    *)
      set_release_failure 40 "release_rejected" \
        "The Crossway release download ended at a non-HTTPS URL"
      return 1
      ;;
  esac
  DOWNLOADED_ARCHIVE_PATH="$archive_path"
  return 0
}

verify_release_asset_file() {
  local archive_path="$1"
  local expected_size="$2"
  local expected_digest="$3"
  local actual_size=""
  local actual_digest=""

  if [ ! -f "$archive_path" ] || [ -L "$archive_path" ]; then
    set_release_failure 40 "release_rejected" \
      "Downloaded Crossway bytes are not a regular file"
    return 1
  fi
  actual_size="$(/usr/bin/stat -f '%z' "$archive_path" 2>/dev/null)" || actual_size=""
  case "$actual_size:$expected_size" in
    *[!0-9:]*)
      set_release_failure 40 "release_rejected" \
        "Crossway release byte count could not be verified"
      return 1
      ;;
  esac
  if [ -z "$actual_size" ] || [ -z "$expected_size" ] || \
    [ "$actual_size" -ne "$expected_size" ]; then
    set_release_failure 40 "release_rejected" \
      "Downloaded Crossway byte count differs from GitHub release metadata"
    return 1
  fi
  actual_digest="$(/usr/bin/shasum -a 256 "$archive_path" 2>/dev/null | \
    /usr/bin/sed -n '1s/[[:space:]].*$//p')" || actual_digest=""
  if ! /usr/bin/printf '%s\n' "$expected_digest" | \
    /usr/bin/grep -Eq '^sha256:[a-f0-9]{64}$'; then
    set_release_failure 40 "release_rejected" \
      "GitHub release digest is outside the strict SHA-256 contract"
    return 1
  fi
  expected_digest="${expected_digest#sha256:}"
  if [ -z "$actual_digest" ] || [ "$actual_digest" != "$expected_digest" ]; then
    set_release_failure 40 "release_rejected" \
      "Downloaded Crossway SHA-256 differs from GitHub release metadata"
    return 1
  fi
  return 0
}

validate_release_archive_file() {
  local archive_path="$1"
  local native_exit=0
  local response=""

  ARCHIVE_ENTRY_COUNT=""
  ARCHIVE_EXPANDED_BYTES=""
  native_validate_zip_file "$archive_path" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_release_failure 20 "host_capability_required" "$PREFLIGHT_DETAIL"
    else
      set_release_failure 40 "archive_rejected" \
        "Crossway.zip failed the strict pre-extraction archive contract"
    fi
    return 1
  fi
  response="$NATIVE_RESPONSE"
  ARCHIVE_ENTRY_COUNT="$(json_extract_optional_raw "$response" 'result.entryCount')"
  ARCHIVE_EXPANDED_BYTES="$(json_extract_optional_raw "$response" 'result.expandedBytes')"
  case "$ARCHIVE_ENTRY_COUNT:$ARCHIVE_EXPANDED_BYTES" in
    ''|:*|*:|*[!0-9:]*)
      set_release_failure 40 "archive_rejected" \
        "Archive validator omitted its bounded topology result"
      return 1
      ;;
  esac
  return 0
}

recheck_extracted_candidate() {
  local extract_root="$1"
  local candidate="${extract_root}/Crossway.app"
  local top_level=""
  local invalid_type=""
  local actual_count=""
  local mode=""

  top_level="$(/usr/bin/find "$extract_root" -mindepth 1 -maxdepth 1 -print 2>/dev/null)" || {
    set_release_failure 40 "archive_rejected" \
      "Extracted Crossway topology could not be enumerated"
    return 1
  }
  if [ "$top_level" != "$candidate" ] || [ ! -d "$candidate" ] || [ -L "$candidate" ]; then
    set_release_failure 40 "archive_rejected" \
      "Crossway.zip did not extract to exactly one Crossway.app"
    return 1
  fi
  invalid_type="$(/usr/bin/find "$extract_root" -mindepth 1 \
    ! -type d ! -type f -print 2>/dev/null)" || invalid_type="inspection_failed"
  if [ -n "$invalid_type" ]; then
    set_release_failure 40 "archive_rejected" \
      "Extracted Crossway contains a link or special file"
    return 1
  fi
  actual_count="$(/usr/bin/find "$extract_root" -mindepth 1 -print 2>/dev/null | \
    /usr/bin/wc -l | /usr/bin/tr -d '[:space:]')" || actual_count=""
  if [ "$actual_count" != "$ARCHIVE_ENTRY_COUNT" ]; then
    set_release_failure 40 "archive_rejected" \
      "Extracted Crossway tree differs from the validated ZIP directory"
    return 1
  fi
  if [ ! -f "$candidate/Contents/MacOS/Crossway" ] || \
    [ -L "$candidate/Contents/MacOS/Crossway" ] || \
    [ ! -x "$candidate/Contents/MacOS/Crossway" ] || \
    [ ! -f "$candidate/Contents/Info.plist" ] || \
    [ -L "$candidate/Contents/Info.plist" ]; then
    set_release_failure 40 "archive_rejected" \
      "Extracted Crossway executable or Info.plist is missing or unsafe"
    return 1
  fi
  if ! /usr/bin/plutil -lint "$candidate/Contents/Info.plist" >/dev/null 2>&1; then
    set_release_failure 40 "archive_rejected" \
      "Extracted Crossway Info.plist is invalid"
    return 1
  fi
  mode="$(/usr/bin/stat -f '%Lp' "$extract_root" 2>/dev/null)" || mode=""
  if [ "$mode" != "700" ]; then
    set_release_failure 20 "host_capability_required" \
      "Private Crossway extraction permissions could not be preserved"
    return 1
  fi
  CANDIDATE_PATH="$candidate"
  return 0
}

extract_release_archive() {
  local archive_path="$1"
  local extract_root="${STATE_DIR}/extracted"
  local unzip_stderr="${STATE_DIR}/unzip.stderr"

  CANDIDATE_PATH=""
  if ! /bin/mkdir "$extract_root" 2>/dev/null || \
    [ -L "$extract_root" ] || ! /bin/chmod 700 "$extract_root" 2>/dev/null; then
    set_release_failure 20 "host_capability_required" \
      "Allow the helper to create a private Crossway extraction directory"
    return 1
  fi
  if ! LC_ALL=C /usr/bin/unzip -qq "$archive_path" -d "$extract_root" \
    2>"$unzip_stderr"; then
    if /usr/bin/grep -Eiq 'operation not permitted|sandbox|deny|denied' "$unzip_stderr"; then
      set_release_failure 20 "host_capability_required" \
        "Allow the helper to extract the verified Crossway archive"
    else
      set_release_failure 40 "archive_rejected" \
        "Crossway.zip could not be extracted after structural validation"
    fi
    return 1
  fi
  recheck_extracted_candidate "$extract_root"
}

prepare_release_candidate() {
  RELEASE_ERROR_EXIT=30
  RELEASE_ERROR_OUTCOME=""
  RELEASE_ERROR_DETAIL=""
  download_release_asset || return 1
  verify_release_asset_file "$DOWNLOADED_ARCHIVE_PATH" \
    "$RELEASE_ASSET_SIZE" "$RELEASE_ASSET_DIGEST" || return 1
  validate_release_archive_file "$DOWNLOADED_ARCHIVE_PATH" || return 1
  extract_release_archive "$DOWNLOADED_ARCHIVE_PATH"
}

run_codesign_seal_check() {
  /usr/bin/codesign --verify --strict --deep "$1" >/dev/null 2>"$2"
}

run_codesign_display() {
  /usr/bin/codesign -d --verbose=4 "$1" >/dev/null 2>"$2"
}

run_codesign_requirement_check() {
  /usr/bin/codesign --verify --strict --deep -R "$2" "$1" >/dev/null 2>"$3"
}

run_gatekeeper_assessment() {
  LC_ALL=C /usr/sbin/spctl -a -t exec -vv "$1" >"$2" 2>&1
}

set_gate_failure_from_file() {
  local stderr_path="$1"
  local rejected_outcome="$2"
  local rejected_detail="$3"
  local capability_detail="$4"

  if /usr/bin/grep -Eiq 'operation not permitted|sandbox|deny|denied' "$stderr_path"; then
    set_release_failure 20 "host_capability_required" "$capability_detail"
  else
    set_release_failure 40 "$rejected_outcome" "$rejected_detail"
  fi
  return 1
}

inspect_candidate_metadata() {
  local candidate="$1"
  local response=""
  local native_exit=0
  local candidate_identifier=""
  local candidate_executable=""
  local architecture_response=""
  local host_arch_present=""
  local os_order=""

  CANDIDATE_VERSION=""
  CANDIDATE_BUILD=""
  CANDIDATE_MINIMUM_OS=""
  CANDIDATE_ARCHITECTURES=""
  native_read_bundle_info "$candidate" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_release_failure 20 "host_capability_required" "$PREFLIGHT_DETAIL"
    else
      set_release_failure 40 "release_rejected" \
        "Candidate Crossway Info.plist failed the strict metadata contract"
    fi
    return 1
  fi
  response="$NATIVE_RESPONSE"
  candidate_identifier="$(json_extract_optional_raw "$response" 'result.bundleIdentifier')"
  candidate_executable="$(json_extract_optional_raw "$response" 'result.executable')"
  CANDIDATE_VERSION="$(json_extract_optional_raw "$response" 'result.shortVersion')"
  CANDIDATE_BUILD="$(json_extract_optional_raw "$response" 'result.buildVersion')"
  CANDIDATE_MINIMUM_OS="$(json_extract_optional_raw "$response" 'result.minimumSystemVersion')"
  if [ "$candidate_identifier" != "$BUNDLE_ID" ] || [ "$candidate_executable" != "Crossway" ]; then
    set_release_failure 40 "release_rejected" \
      "Candidate Crossway bundle identity or executable name is wrong"
    return 1
  fi
  if [ "$CANDIDATE_VERSION" != "$RELEASE_MARKETING_VERSION" ] || \
    [ "$CANDIDATE_BUILD" != "$RELEASE_BUILD" ]; then
    set_release_failure 40 "release_rejected" \
      "Candidate Crossway version does not reconstruct the selected release tag"
    return 1
  fi
  os_order="$(compare_release_versions "$HOST_OS_VERSION" 0 "$CANDIDATE_MINIMUM_OS" 0)" || {
    set_release_failure 40 "release_rejected" \
      "Candidate Crossway minimum macOS version is invalid"
    return 1
  }
  if [ "$os_order" = "-1" ]; then
    set_release_failure 40 "incompatible_os" \
      "This Crossway release requires a newer version of macOS"
    return 1
  fi

  native_exit=0
  native_read_macho_architectures "$candidate/Contents/MacOS/Crossway" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_release_failure 20 "host_capability_required" "$PREFLIGHT_DETAIL"
    else
      set_release_failure 40 "release_rejected" \
        "Candidate Crossway executable is not a supported Mach-O"
    fi
    return 1
  fi
  architecture_response="$NATIVE_RESPONSE"
  CANDIDATE_ARCHITECTURES="$(json_extract_optional_raw "$architecture_response" 'result.count')"
  host_arch_present="$(json_extract_optional_raw "$architecture_response" "result.${HOST_ARCHITECTURE}")"
  case "$CANDIDATE_ARCHITECTURES:$host_arch_present" in
    [12]:true) ;;
    *)
      set_release_failure 40 "release_rejected" \
        "Candidate Crossway does not contain the host architecture"
      return 1
      ;;
  esac

  if [ "$INSTALLED_STATE" = "valid" ]; then
    if [ -z "$INSTALLED_VERSION" ] || [ -z "$INSTALLED_BUILD" ]; then
      set_release_failure 40 "release_rejected" \
        "Installed Crossway version metadata is incomplete"
      return 1
    fi
    ensure_release_not_older "$INSTALLED_VERSION" "$INSTALLED_BUILD" \
      "$CANDIDATE_VERSION" "$CANDIDATE_BUILD" || return 1
  fi
  return 0
}

verify_candidate_signature() {
  local candidate="$1"
  local phase="$2"
  local seal_stderr="${STATE_DIR}/candidate-${phase}-seal.stderr"
  local display_output="${STATE_DIR}/candidate-${phase}-identity.txt"
  local requirement_stderr="${STATE_DIR}/candidate-${phase}-requirement.stderr"
  local continuity_stderr="${STATE_DIR}/candidate-${phase}-continuity.stderr"
  local display_exit=0
  local team=""
  local signing_id=""
  local developer_id="false"

  CANDIDATE_CDHASH=""

  if ! run_codesign_seal_check "$candidate" "$seal_stderr"; then
    set_gate_failure_from_file "$seal_stderr" "signature_rejected" \
      "Candidate Crossway has an invalid strict/deep code seal" \
      "Allow the helper to verify the candidate Crossway code seal"
    return 1
  fi
  run_codesign_display "$candidate" "$display_output" || display_exit=$?
  if [ "$display_exit" -ne 0 ]; then
    set_gate_failure_from_file "$display_output" "signature_rejected" \
      "Candidate Crossway signing identity could not be verified" \
      "Allow the helper to inspect the candidate Crossway signing identity"
    return 1
  fi
  team="$(/usr/bin/sed -n 's/^TeamIdentifier=//p' "$display_output" | /usr/bin/head -1)"
  signing_id="$(/usr/bin/sed -n 's/^Identifier=//p' "$display_output" | /usr/bin/head -1)"
  CANDIDATE_CDHASH="$(/usr/bin/sed -n 's/^CDHash=//p' "$display_output" | /usr/bin/head -1)"
  if /usr/bin/grep -q '^Authority=Developer ID Application:' "$display_output"; then
    developer_id="true"
  fi
  if [ "$team" != "$TEAM_ID" ] || [ "$signing_id" != "$BUNDLE_ID" ] || \
    [ "$developer_id" != "true" ] || ! /usr/bin/printf '%s\n' "$CANDIDATE_CDHASH" | \
    /usr/bin/grep -Eq '^[a-f0-9]{40}$'; then
    set_release_failure 40 "signature_rejected" \
      "Candidate Crossway signing identifier, team, or certificate class is wrong"
    return 1
  fi
  if ! run_codesign_requirement_check "$candidate" "$PINNED_CODE_REQUIREMENT" \
    "$requirement_stderr"; then
    set_gate_failure_from_file "$requirement_stderr" "signature_rejected" \
      "Candidate Crossway does not satisfy the pinned Developer ID Application requirement" \
      "Allow the helper to test the candidate Crossway signing requirement"
    return 1
  fi
  if [ "$INSTALLED_STATE" = "valid" ]; then
    if [ -z "$INSTALLED_DESIGNATED_REQUIREMENT" ]; then
      set_release_failure 40 "signature_rejected" \
        "Installed Crossway designated requirement is unavailable"
      return 1
    fi
    if ! run_codesign_requirement_check "$candidate" \
      "$INSTALLED_DESIGNATED_REQUIREMENT" "$continuity_stderr"; then
      set_gate_failure_from_file "$continuity_stderr" "signature_rejected" \
        "Candidate Crossway does not satisfy the valid installed identity" \
        "Allow the helper to verify Crossway update identity continuity"
      return 1
    fi
  fi
  return 0
}

verify_candidate_gatekeeper() {
  local candidate="$1"
  local phase="$2"
  local assessment_output="${STATE_DIR}/candidate-${phase}-spctl.txt"

  if ! run_gatekeeper_assessment "$candidate" "$assessment_output"; then
    set_gate_failure_from_file "$assessment_output" "notarization_rejected" \
      "Gatekeeper rejected the candidate Crossway release" \
      "Allow the helper to assess the candidate Crossway with Gatekeeper"
    return 1
  fi
  if ! /usr/bin/grep -Eq '(^|: )accepted$' "$assessment_output" || \
    ! /usr/bin/grep -qx 'source=Notarized Developer ID' "$assessment_output"; then
    set_release_failure 40 "notarization_rejected" \
      "Gatekeeper did not report Notarized Developer ID acceptance"
    return 1
  fi
  return 0
}

verify_candidate_gate() {
  local candidate="$1"
  local phase="$2"

  case "$phase" in
    private|staging|final) ;;
    *)
      set_release_failure 2 "internal_invariant_failed" \
        "Candidate verification phase is invalid"
      return 1
      ;;
  esac
  inspect_candidate_metadata "$candidate" || return 1
  verify_candidate_signature "$candidate" "$phase" || return 1
  verify_candidate_gatekeeper "$candidate" "$phase"
}

append_canonical_field() {
  local destination="$1"
  local field_name="$2"
  local field_value="$3"
  local LC_ALL=C

  /usr/bin/printf '%s:%s:%s:' "${#field_name}" "$field_name" "${#field_value}" \
    >> "$destination" || return 1
  /usr/bin/printf '%s\n' "$field_value" >> "$destination"
}

sha256_file_value() {
  /usr/bin/shasum -a 256 "$1" 2>/dev/null | \
    /usr/bin/sed -n '1s/[[:space:]].*$//p'
}

fingerprint_bundle_tree() {
  local target="$1"
  local list_path="${STATE_DIR}/installed-tree.list"
  local manifest_path="${STATE_DIR}/installed-tree.manifest"
  local item=""
  local relative=""
  local entry_type=""
  local mode=""
  local size=""
  local content_value=""
  local count=0
  local digest=""

  TREE_FINGERPRINT=""
  : > "$manifest_path" || {
    set_release_failure 20 "host_capability_required" \
      "Allow the helper to create a private installed-app fingerprint"
    return 1
  }
  if ! LC_ALL=C /usr/bin/find -s -x "$target" -print0 > "$list_path" 2>/dev/null; then
    set_release_failure 20 "host_capability_required" \
      "Allow the helper to enumerate the selected Crossway app"
    return 1
  fi
  while IFS= read -r -d '' item; do
    count=$((count + 1))
    if [ "$count" -gt 20000 ]; then
      set_release_failure 20 "user_action_required" \
        "The selected Crossway app has an unexpectedly large filesystem tree"
      return 1
    fi
    if [ "$item" = "$target" ]; then
      relative="."
    else
      case "$item" in
        "$target"/*) relative="${item#"$target"/}" ;;
        *)
          set_release_failure 2 "internal_invariant_failed" \
            "Installed-app enumeration escaped its selected target"
          return 1
          ;;
      esac
    fi
    mode="$(/usr/bin/stat -f '%Lp' "$item" 2>/dev/null)" || mode=""
    content_value=""
    size=""
    if [ -L "$item" ]; then
      entry_type="link"
      content_value="$(/usr/bin/readlink "$item" 2>/dev/null)" || content_value=""
      if [ -z "$content_value" ]; then
        set_release_failure 20 "host_capability_required" \
          "Installed Crossway link metadata could not be read"
        return 1
      fi
    elif [ -d "$item" ]; then
      entry_type="directory"
    elif [ -f "$item" ]; then
      entry_type="file"
      size="$(/usr/bin/stat -f '%z' "$item" 2>/dev/null)" || size=""
      content_value="$(sha256_file_value "$item")" || content_value=""
      if [ -z "$content_value" ] || [ -z "$size" ]; then
        set_release_failure 20 "host_capability_required" \
          "Allow the helper to hash the selected Crossway app"
        return 1
      fi
    else
      set_release_failure 20 "user_action_required" \
        "The selected Crossway app contains a special filesystem object"
      return 1
    fi
    if [ -z "$mode" ] || \
      ! append_canonical_field "$manifest_path" "path" "$relative" || \
      ! append_canonical_field "$manifest_path" "type" "$entry_type" || \
      ! append_canonical_field "$manifest_path" "mode" "$mode" || \
      ! append_canonical_field "$manifest_path" "size" "$size" || \
      ! append_canonical_field "$manifest_path" "content" "$content_value"; then
      set_release_failure 20 "host_capability_required" \
        "Installed Crossway fingerprint could not be recorded privately"
      return 1
    fi
  done < "$list_path"
  if [ "$count" -lt 1 ]; then
    set_release_failure 20 "host_capability_required" \
      "Selected Crossway app could not be fingerprinted"
    return 1
  fi
  digest="$(sha256_file_value "$manifest_path")" || digest=""
  if ! /usr/bin/printf '%s\n' "$digest" | /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
    set_release_failure 20 "host_capability_required" \
      "Installed Crossway fingerprint could not be finalized"
    return 1
  fi
  TREE_FINGERPRINT="$digest"
  return 0
}

build_installed_fingerprint() {
  local manifest_path="${STATE_DIR}/installed-state.manifest"
  local tree_digest="absent"
  local digest=""

  INSTALLED_FINGERPRINT=""
  INSTALLED_TREE_FINGERPRINT="absent"
  if [ "$INSTALLED_STATE" != "absent" ]; then
    fingerprint_bundle_tree "$SELECTED_TARGET" || return 1
    tree_digest="$TREE_FINGERPRINT"
    INSTALLED_TREE_FINGERPRINT="$TREE_FINGERPRINT"
  fi
  if ! : > "$manifest_path" || \
    ! append_canonical_field "$manifest_path" "target" "$SELECTED_TARGET" || \
    ! append_canonical_field "$manifest_path" "state" "$INSTALLED_STATE" || \
    ! append_canonical_field "$manifest_path" "version" "$INSTALLED_VERSION" || \
    ! append_canonical_field "$manifest_path" "build" "$INSTALLED_BUILD" || \
    ! append_canonical_field "$manifest_path" "team" "$INSTALLED_TEAM" || \
    ! append_canonical_field "$manifest_path" "identifier" "$INSTALLED_SIGNING_ID" || \
    ! append_canonical_field "$manifest_path" "cdhash" "$INSTALLED_CDHASH" || \
    ! append_canonical_field "$manifest_path" "developer_id" "$INSTALLED_DEVELOPER_ID" || \
    ! append_canonical_field "$manifest_path" "designated_requirement" \
      "$INSTALLED_DESIGNATED_REQUIREMENT" || \
    ! append_canonical_field "$manifest_path" "tree_sha256" "$tree_digest"; then
    set_release_failure 20 "host_capability_required" \
      "Installed Crossway state could not be recorded privately"
    return 1
  fi
  digest="$(sha256_file_value "$manifest_path")" || digest=""
  if ! /usr/bin/printf '%s\n' "$digest" | /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
    set_release_failure 20 "host_capability_required" \
      "Installed Crossway state fingerprint could not be finalized"
    return 1
  fi
  INSTALLED_FINGERPRINT="$digest"
  return 0
}

classify_planned_action() {
  local order=""
  local marketing_order=""

  PLANNED_ACTION=""
  case "$INSTALLED_STATE" in
    absent)
      if [ -n "$REPAIR_REASON" ]; then
        set_release_failure 2 "internal_invariant_failed" \
          "An absent Crossway target cannot carry a repair reason"
        return 1
      fi
      PLANNED_ACTION="install"
      ;;
    damaged_expected_identity)
      if [ "$REPAIR_REASON" != "broken_seal" ]; then
        set_release_failure 2 "internal_invariant_failed" \
          "Damaged Crossway planning requires broken-seal evidence"
        return 1
      fi
      PLANNED_ACTION="repair"
      ;;
    valid)
      case "$REPAIR_REASON" in
        hard_quarantine|lost_staple_likely|notarization_rejected)
          PLANNED_ACTION="repair"
          ;;
        "")
          order="$(compare_release_versions "$INSTALLED_VERSION" "$INSTALLED_BUILD" \
            "$CANDIDATE_VERSION" "$CANDIDATE_BUILD")" || {
            set_release_failure 40 "release_rejected" \
              "Installed Crossway version could not be compared with the candidate"
            return 1
          }
          case "$order" in
            -1)
              marketing_order="$(compare_release_versions "$INSTALLED_VERSION" 0 \
                "$CANDIDATE_VERSION" 0)" || {
                set_release_failure 40 "release_rejected" \
                  "Installed Crossway marketing version could not be compared"
                return 1
              }
              if [ "$marketing_order" = "0" ]; then
                PLANNED_ACTION="maintenance_update"
              else
                PLANNED_ACTION="update"
              fi
              ;;
            0)
              if [ -z "$INSTALLED_CDHASH" ] || [ -z "$CANDIDATE_CDHASH" ]; then
                set_release_failure 2 "internal_invariant_failed" \
                  "Crossway exact-version identity evidence is incomplete"
                return 1
              elif [ "$INSTALLED_CDHASH" != "$CANDIDATE_CDHASH" ]; then
                PLANNED_ACTION="maintenance_update"
              elif [ "$INSTALLED_RUNNING" = "true" ]; then
                PLANNED_ACTION="no_op"
              else
                PLANNED_ACTION="launch"
              fi
              ;;
            1)
              set_release_failure 40 "downgrade_refused" \
                "The installed Crossway version is newer than the latest published version"
              return 1
              ;;
            *)
              set_release_failure 2 "internal_invariant_failed" \
                "Crossway plan action comparison returned an invalid result"
              return 1
              ;;
          esac
          ;;
        *)
          set_release_failure 2 "internal_invariant_failed" \
            "Crossway planning received an unsupported repair reason"
          return 1
          ;;
      esac
      ;;
    *)
      set_release_failure 2 "internal_invariant_failed" \
        "Crossway plan action received an unsupported installed state"
      return 1
      ;;
  esac

  PROCESS_IMPACT="none"
  case "$PLANNED_ACTION:$INSTALLED_RUNNING" in
    update:true|maintenance_update:true|repair:true)
      case "$INSTALLED_RUNNING_PID" in
        ''|*[!0-9]*)
          set_release_failure 2 "internal_invariant_failed" \
            "Running Crossway process did not have one exact PID"
          return 1
          ;;
      esac
      PROCESS_IMPACT="quit:${INSTALLED_RUNNING_PID}:${SELECTED_TARGET}"
      ;;
  esac
  return 0
}

compute_confirmation_plan_id() {
  local manifest_path="${STATE_DIR}/confirmation-plan.manifest"
  local digest=""

  COMPUTED_PLAN_ID=""
  if ! : > "$manifest_path" || \
    ! append_canonical_field "$manifest_path" "schema" "crossway-plan-v1" || \
    ! append_canonical_field "$manifest_path" "action" "$PLANNED_ACTION" || \
    ! append_canonical_field "$manifest_path" "repair_reason" "$REPAIR_REASON" || \
    ! append_canonical_field "$manifest_path" "target" "$SELECTED_TARGET" || \
    ! append_canonical_field "$manifest_path" "canonical_install_count" \
      "$TARGET_DUPLICATE_COUNT" || \
    ! append_canonical_field "$manifest_path" "installed_fingerprint" \
      "$INSTALLED_FINGERPRINT" || \
    ! append_canonical_field "$manifest_path" "installed_version" "$INSTALLED_VERSION" || \
    ! append_canonical_field "$manifest_path" "installed_build" "$INSTALLED_BUILD" || \
    ! append_canonical_field "$manifest_path" "installed_requirement" \
      "$INSTALLED_DESIGNATED_REQUIREMENT" || \
    ! append_canonical_field "$manifest_path" "installed_cdhash" \
      "$INSTALLED_CDHASH" || \
    ! append_canonical_field "$manifest_path" "release_tag" "$RELEASE_TAG" || \
    ! append_canonical_field "$manifest_path" "asset_digest" "$RELEASE_ASSET_DIGEST" || \
    ! append_canonical_field "$manifest_path" "asset_size" "$RELEASE_ASSET_SIZE" || \
    ! append_canonical_field "$manifest_path" "candidate_version" "$CANDIDATE_VERSION" || \
    ! append_canonical_field "$manifest_path" "candidate_build" "$CANDIDATE_BUILD" || \
    ! append_canonical_field "$manifest_path" "candidate_cdhash" "$CANDIDATE_CDHASH" || \
    ! append_canonical_field "$manifest_path" "candidate_tree_sha256" \
      "$CANDIDATE_FINGERPRINT" || \
    ! append_canonical_field "$manifest_path" "candidate_requirement" \
      "$PINNED_CODE_REQUIREMENT" || \
    ! append_canonical_field "$manifest_path" "candidate_minimum_os" \
      "$CANDIDATE_MINIMUM_OS" || \
    ! append_canonical_field "$manifest_path" "candidate_architecture_count" \
      "$CANDIDATE_ARCHITECTURES" || \
    ! append_canonical_field "$manifest_path" "host_architecture" "$HOST_ARCHITECTURE" || \
    ! append_canonical_field "$manifest_path" "process_impact" "$PROCESS_IMPACT"; then
    set_release_failure 2 "internal_invariant_failed" \
      "Crossway confirmation plan could not be recorded privately"
    return 1
  fi
  digest="$(sha256_file_value "$manifest_path")" || digest=""
  if ! /usr/bin/printf '%s\n' "$digest" | /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
    set_release_failure 2 "internal_invariant_failed" \
      "Crossway confirmation plan ID could not be finalized"
    return 1
  fi
  COMPUTED_PLAN_ID="$digest"
  return 0
}

build_confirmation_plan() {
  build_installed_fingerprint || return 1
  fingerprint_bundle_tree "$CANDIDATE_PATH" || return 1
  CANDIDATE_FINGERPRINT="$TREE_FINGERPRINT"
  classify_planned_action || return 1
  compute_confirmation_plan_id
}

emit_confirmation_checklist() {
  local action_text=""
  local installed_text=""
  local process_text="No running process will be quit"
  local rollback_text="The previous verified app will be retained until the replacement is healthy"
  local digest_text="${RELEASE_ASSET_DIGEST#sha256:}"
  local repair_text=""

  case "$PLANNED_ACTION" in
    install) action_text="Install the latest verified Crossway" ;;
    update) action_text="Update Crossway to the latest verified version" ;;
    maintenance_update) action_text="Apply the latest verified maintenance recut" ;;
    launch) action_text="Launch the already-current verified Crossway" ;;
    no_op) action_text="Keep the already-current verified Crossway running" ;;
    repair) action_text="Repair Crossway with the latest verified release" ;;
    *) action_text="Unknown action" ;;
  esac
  case "$REPAIR_REASON" in
    broken_seal) repair_text="The installed app's signed bundle is damaged" ;;
    hard_quarantine)
      repair_text="The installed app carries hard quarantine from a sandboxed transfer"
      ;;
    lost_staple_likely)
      repair_text="The installed app appears to have lost notarization ticket evidence"
      ;;
    notarization_rejected)
      repair_text="Gatekeeper rejects the installed app's notarization"
      ;;
    "") ;;
    *) repair_text="Unknown repair reason" ;;
  esac
  case "$INSTALLED_STATE" in
    absent) installed_text="No Crossway app is installed at the destination" ;;
    valid)
      installed_text="Crossway ${INSTALLED_VERSION}; identifier ${INSTALLED_SIGNING_ID}; team ${INSTALLED_TEAM}"
      ;;
    damaged_expected_identity)
      installed_text="Crossway ${INSTALLED_VERSION:-unknown}; expected identity with a damaged code seal"
      ;;
  esac
  case "$PROCESS_IMPACT" in
    quit:*)
      process_text="Quit PID ${INSTALLED_RUNNING_PID} only from ${SELECTED_TARGET}"
      ;;
  esac
  case "$PLANNED_ACTION" in
    launch|no_op) rollback_text="No app bundle will be replaced" ;;
  esac

  {
    /usr/bin/printf '%s\n' \
      "Crossway verified plan" \
      "  Action: ${action_text}"
    if [ -n "$repair_text" ]; then
      /usr/bin/printf '%s\n' "  Repair reason: ${repair_text}"
    fi
    /usr/bin/printf '%s\n' \
      "  Destination: ${SELECTED_TARGET}" \
      "  Installed: ${installed_text}" \
      "  Candidate: Crossway ${CANDIDATE_VERSION}" \
      "  Release source: https://github.com/crossway-app/Crossway-Releases" \
      "  SHA-256: ${digest_text}" \
      "  Process impact: ${process_text}" \
      "  Rollback: ${rollback_text}" \
      "  Privacy permissions: Accessibility and Screen Recording remain controlled by macOS; Crossway may ask for onboarding" \
      "  Plan ID: ${COMPUTED_PLAN_ID}"
  } >&2
}

route_installed_diagnosis_for_plan() {
  REPAIR_REASON=""
  case "$INSTALLED_STATE" in
    absent)
      return 0
      ;;
    damaged_expected_identity)
      if [ "$INSTALLED_RUNNING" = "true" ]; then
        set_release_failure 20 "user_action_required" \
          "Quit the damaged app manually because its running identity cannot be verified"
        return 1
      fi
      REPAIR_REASON="broken_seal"
      return 0
      ;;
    wrong_identity)
      set_release_failure 20 "user_action_required" \
        "Preserve the unrecognized occupant and choose or remove it manually"
      return 1
      ;;
    valid) ;;
    *)
      set_release_failure 2 "internal_invariant_failed" \
        "Crossway repair routing received an unsupported installed state"
      return 1
      ;;
  esac

  case "$DIAGNOSIS_CODE" in
    hard_quarantine|lost_staple_likely|notarization_rejected)
      REPAIR_REASON="$DIAGNOSIS_CODE"
      ;;
    gatekeeper_app_store_only)
      set_release_failure 20 "user_action_required" "$DIAGNOSIS_DETAIL"
      return 1
      ;;
    gatekeeper_not_observable)
      set_release_failure 20 "host_capability_required" "$DIAGNOSIS_DETAIL"
      return 1
      ;;
    incompatible_os|incompatible_architecture)
      set_release_failure 40 "incompatible_os" "$DIAGNOSIS_DETAIL"
      return 1
      ;;
    healthy_older|healthy_current|healthy_newer|healthy_version_unchecked)
      ;;
    *)
      set_release_failure 2 "internal_invariant_failed" \
        "Crossway repair routing received an unsupported diagnosis"
      return 1
      ;;
  esac
  return 0
}

build_verified_plan() {
  local command_action="$1"
  local explicit_target="$2"

  inspect_local_state "$command_action" "$explicit_target"
  DIAGNOSIS_CODE=""
  DIAGNOSIS_DETAIL=""
  if [ "$INSTALLED_STATE" = "valid" ]; then
    if ! diagnose_selected_target; then
      set_release_failure 2 "internal_invariant_failed" \
        "Installed Crossway diagnosis could not be classified"
      return 1
    fi
  fi
  route_installed_diagnosis_for_plan || return 1
  resolve_latest_release || return 1
  prepare_release_candidate || return 1
  verify_candidate_gate "$CANDIDATE_PATH" "private" || return 1
  build_confirmation_plan
}

finish_verified_plan_failure() {
  local command_action="$1"

  /usr/bin/printf '%s: %s\n' "$PROGRAM_NAME" "$RELEASE_ERROR_DETAIL" >&2
  finish "$RELEASE_ERROR_EXIT" "$RELEASE_ERROR_OUTCOME" "$command_action" "$SELECTED_TARGET" \
    "$INSTALLED_VERSION" "$RELEASE_MARKETING_VERSION" "not_observable" "" \
    "$RELEASE_ERROR_DETAIL"
}

set_lifecycle_failure() {
  LIFECYCLE_ERROR_EXIT="$1"
  LIFECYCLE_ERROR_OUTCOME="$2"
  LIFECYCLE_ERROR_DETAIL="$3"
  return 1
}

poll_pause() {
  /bin/sleep 0.2
}

inspect_exact_process() {
  local pid="$1"
  local expected_path="$2"
  local native_exit=0
  local response=""
  local running=""
  local actual_pid=""
  local bundle_id=""
  local bundle_path=""
  local standardized_path=""
  local resolved_path=""
  local executable_path=""

  EXACT_PROCESS_STATE=""
  EXACT_PROCESS_PID=""
  case "$pid" in
    ''|*[!0-9]*)
      set_lifecycle_failure 2 "internal_invariant_failed" \
        "Exact-process inspection requires one recorded PID"
      return 1
      ;;
  esac
  native_process_details "$pid" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_lifecycle_failure 20 "host_capability_required" \
        "Allow the helper to inspect the recorded Crossway process"
    else
      set_lifecycle_failure 2 "internal_invariant_failed" \
        "Recorded-process data did not match the native adapter contract"
    fi
    return 1
  fi
  response="$NATIVE_RESPONSE"
  running="$(json_extract_optional_raw "$response" 'result.running')"
  if [ "$running" = "false" ]; then
    EXACT_PROCESS_STATE="absent"
    EXACT_PROCESS_PID="$pid"
    return 0
  fi
  if [ "$running" != "true" ]; then
    set_lifecycle_failure 2 "internal_invariant_failed" \
      "Recorded-process adapter omitted its running state"
    return 1
  fi
  actual_pid="$(json_extract_optional_raw "$response" 'result.application.pid')"
  bundle_id="$(json_extract_optional_raw "$response" 'result.application.bundleIdentifier')"
  bundle_path="$(json_extract_optional_raw "$response" 'result.application.bundlePath')"
  standardized_path="$(json_extract_optional_raw "$response" 'result.application.standardizedBundlePath')"
  resolved_path="$(json_extract_optional_raw "$response" 'result.application.resolvedBundlePath')"
  executable_path="$(json_extract_optional_raw "$response" 'result.application.executablePath')"
  if [ "$actual_pid" != "$pid" ] || [ "$bundle_id" != "$BUNDLE_ID" ] || \
    [ "$bundle_path" != "$expected_path" ] || [ "$standardized_path" != "$expected_path" ] || \
    [ "$resolved_path" != "$expected_path" ] || \
    [ "$executable_path" != "$expected_path/Contents/MacOS/Crossway" ]; then
    EXACT_PROCESS_STATE="changed"
    EXACT_PROCESS_PID="$pid"
    return 0
  fi
  EXACT_PROCESS_STATE="exact"
  EXACT_PROCESS_PID="$pid"
  return 0
}

wait_for_recorded_process_exit() {
  local pid="$1"
  local expected_path="$2"
  local attempt=0

  while [ "$attempt" -lt "$QUIT_POLL_ATTEMPTS" ]; do
    inspect_exact_process "$pid" "$expected_path" || return 1
    case "$EXACT_PROCESS_STATE" in
      absent) return 0 ;;
      changed)
        set_lifecycle_failure 20 "unsafe_running_copy" \
          "The recorded PID changed identity while Crossway was quitting"
        return 1
        ;;
      exact) ;;
    esac
    attempt=$((attempt + 1))
    if [ "$attempt" -lt "$QUIT_POLL_ATTEMPTS" ] && ! poll_pause; then
      set_lifecycle_failure 20 "host_capability_required" \
        "Allow the helper to wait for Crossway to quit gracefully"
      return 1
    fi
  done
  set_lifecycle_failure 20 "app_refused_quit" \
    "Crossway did not quit after an exact graceful termination request"
  return 1
}

terminate_recorded_process() {
  local pid="$1"
  local expected_path="$2"
  local native_exit=0
  local response=""
  local running=""
  local requested=""

  LIFECYCLE_ERROR_OUTCOME=""
  LIFECYCLE_ERROR_DETAIL=""
  inspect_exact_process "$pid" "$expected_path" || return 1
  case "$EXACT_PROCESS_STATE" in
    absent) return 0 ;;
    changed)
      set_lifecycle_failure 20 "unsafe_running_copy" \
        "The recorded PID no longer belongs to the selected Crossway app"
      return 1
      ;;
  esac
  native_terminate_exact_process "$pid" "$BUNDLE_ID" "$expected_path" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    case "$NATIVE_RESPONSE" in
      *'"code":"process_identity_changed"'*)
        set_lifecycle_failure 20 "unsafe_running_copy" \
          "The recorded PID changed identity immediately before termination"
        ;;
      *)
        if [ "$native_exit" -eq 20 ]; then
          set_lifecycle_failure 20 "host_capability_required" \
            "Allow the helper to request graceful termination of the exact Crossway process"
        else
          set_lifecycle_failure 2 "internal_invariant_failed" \
            "Exact Crossway termination request failed its adapter contract"
        fi
        ;;
    esac
    return 1
  fi
  response="$NATIVE_RESPONSE"
  running="$(json_extract_optional_raw "$response" 'result.running')"
  requested="$(json_extract_optional_raw "$response" 'result.terminationRequested')"
  if [ "$running" = "false" ]; then
    return 0
  fi
  if [ "$running" != "true" ] || [ "$requested" != "true" ]; then
    set_lifecycle_failure 20 "app_refused_quit" \
      "Crossway refused the exact graceful termination request"
    return 1
  fi
  wait_for_recorded_process_exit "$pid" "$expected_path"
}

run_open_exact() {
  /usr/bin/open -n "$1" >/dev/null 2>"$2"
}

refresh_launch_topology() {
  local expected_path="$1"
  local enumerate_exit=0
  local exact_count=0
  local other_count=0
  local exact_pid=""
  local exact_executable=""

  enumerate_running_crossways || enumerate_exit=$?
  if [ "$enumerate_exit" -ne 0 ]; then
    if [ "$enumerate_exit" -eq 20 ]; then
      set_lifecycle_failure 20 "host_capability_required" \
        "Allow the helper to inspect Crossway launch health"
    else
      set_lifecycle_failure 2 "internal_invariant_failed" \
        "Crossway launch topology failed its adapter contract"
    fi
    return 1
  fi
  case "$expected_path" in
    "$SYSTEM_TARGET")
      exact_count="$SYSTEM_RUNNING_COUNT"
      other_count="$USER_RUNNING_COUNT"
      exact_pid="$SYSTEM_RUNNING_PID"
      exact_executable="$SYSTEM_RUNNING_EXECUTABLE"
      ;;
    "$USER_TARGET")
      exact_count="$USER_RUNNING_COUNT"
      other_count="$SYSTEM_RUNNING_COUNT"
      exact_pid="$USER_RUNNING_PID"
      exact_executable="$USER_RUNNING_EXECUTABLE"
      ;;
    *)
      set_lifecycle_failure 2 "internal_invariant_failed" \
        "Launch health requires one canonical Crossway target"
      return 1
      ;;
  esac
  if [ "$UNSAFE_RUNNING_COUNT" -gt 0 ] || [ "$other_count" -gt 0 ] || \
    [ "$exact_count" -gt 1 ]; then
    set_lifecycle_failure 20 "unsafe_running_copy" \
      "A same-identity Crossway process is running outside the exact launch target"
    return 1
  fi
  if [ "$exact_count" -eq 0 ]; then
    return 3
  fi
  case "$exact_pid" in
    ''|*[!0-9]*)
      set_lifecycle_failure 2 "internal_invariant_failed" \
        "Exact launch arrival did not have one PID"
      return 1
      ;;
  esac
  if [ "$exact_executable" != "$expected_path/Contents/MacOS/Crossway" ]; then
    set_lifecycle_failure 20 "unsafe_running_copy" \
      "Arriving Crossway executable path did not match the exact target"
    return 1
  fi
  LAUNCHED_PROCESS_PID="$exact_pid"
  return 0
}

verify_launch_bundle_version() {
  local target="$1"
  local expected_version="$2"
  local expected_build="$3"
  local native_exit=0
  local response=""
  local actual_version=""
  local actual_build=""

  native_read_bundle_info "$target" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_lifecycle_failure 20 "host_capability_required" \
        "Allow the helper to verify the launched Crossway version"
    else
      set_lifecycle_failure 20 "launch_health_failed" \
        "Launched Crossway Info.plist could not be read"
    fi
    return 1
  fi
  response="$NATIVE_RESPONSE"
  actual_version="$(json_extract_optional_raw "$response" 'result.shortVersion')"
  actual_build="$(json_extract_optional_raw "$response" 'result.buildVersion')"
  if [ "$actual_version" != "$expected_version" ] || [ "$actual_build" != "$expected_build" ]; then
    set_lifecycle_failure 20 "launch_health_failed" \
      "Launched Crossway version did not match the verified candidate"
    return 1
  fi
  return 0
}

launch_exact_and_wait_health() {
  local target="$1"
  local expected_version="$2"
  local expected_build="$3"
  local old_pid="$4"
  local open_stderr="${STATE_DIR}/open-exact.stderr"
  local attempt=0
  local topology_exit=0
  local arriving_pid=""

  LIFECYCLE_ERROR_OUTCOME=""
  LIFECYCLE_ERROR_DETAIL=""
  LAUNCHED_PROCESS_PID=""
  if [ -n "$old_pid" ]; then
    inspect_exact_process "$old_pid" "$target" || return 1
    case "$EXACT_PROCESS_STATE" in
      absent) ;;
      changed)
        set_lifecycle_failure 20 "unsafe_running_copy" \
          "The prior PID changed identity before Crossway launch"
        return 1
        ;;
      exact)
        set_lifecycle_failure 20 "app_refused_quit" \
          "The prior Crossway process is still running before launch"
        return 1
        ;;
    esac
  fi
  if ! run_open_exact "$target" "$open_stderr"; then
    if /usr/bin/grep -Eiq 'operation not permitted|sandbox|deny|denied' "$open_stderr"; then
      set_lifecycle_failure 20 "host_capability_required" \
        "Allow the helper to launch the exact verified Crossway app"
    else
      set_lifecycle_failure 20 "launch_failed" \
        "macOS rejected the exact-path Crossway launch request"
    fi
    return 1
  fi
  while [ "$attempt" -lt "$LAUNCH_POLL_ATTEMPTS" ]; do
    topology_exit=0
    refresh_launch_topology "$target" || topology_exit=$?
    case "$topology_exit" in
      0) break ;;
      3) ;;
      *) return 1 ;;
    esac
    attempt=$((attempt + 1))
    if [ "$attempt" -lt "$LAUNCH_POLL_ATTEMPTS" ] && ! poll_pause; then
      set_lifecycle_failure 20 "host_capability_required" \
        "Allow the helper to wait for Crossway launch health"
      return 1
    fi
  done
  if [ "$topology_exit" -ne 0 ] || [ -z "$LAUNCHED_PROCESS_PID" ]; then
    set_lifecycle_failure 20 "launch_health_failed" \
      "Crossway launch returned without an exact-path process"
    return 1
  fi
  arriving_pid="$LAUNCHED_PROCESS_PID"
  if [ -n "$old_pid" ] && [ "$arriving_pid" = "$old_pid" ]; then
    set_lifecycle_failure 20 "launch_health_failed" \
      "Crossway launch did not produce a newly arriving process"
    return 1
  fi
  verify_launch_bundle_version "$target" "$expected_version" "$expected_build" || return 1

  attempt=0
  while [ "$attempt" -lt "$HEALTH_GRACE_POLLS" ]; do
    topology_exit=0
    refresh_launch_topology "$target" || topology_exit=$?
    if [ "$topology_exit" -ne 0 ] || [ "$LAUNCHED_PROCESS_PID" != "$arriving_pid" ]; then
      if [ "$topology_exit" -eq 3 ]; then
        set_lifecycle_failure 20 "launch_health_failed" \
          "The exact Crossway process exited during its health grace period"
      elif [ "$topology_exit" -eq 0 ]; then
        set_lifecycle_failure 20 "launch_health_failed" \
          "The arriving Crossway PID changed during its health grace period"
      fi
      return 1
    fi
    inspect_exact_process "$arriving_pid" "$target" || return 1
    if [ "$EXACT_PROCESS_STATE" != "exact" ]; then
      set_lifecycle_failure 20 "launch_health_failed" \
        "The arriving Crossway process lost its exact identity during health checks"
      return 1
    fi
    attempt=$((attempt + 1))
    if [ "$attempt" -lt "$HEALTH_GRACE_POLLS" ] && ! poll_pause; then
      set_lifecycle_failure 20 "host_capability_required" \
        "Allow the helper to complete Crossway launch health checks"
      return 1
    fi
  done
  LAUNCHED_PROCESS_PID="$arriving_pid"
  return 0
}

set_transaction_failure() {
  TRANSACTION_ERROR_EXIT="$1"
  TRANSACTION_ERROR_OUTCOME="$2"
  TRANSACTION_ERROR_DETAIL="$3"
  return 1
}

compute_transaction_paths() {
  local target="$1"
  local parent=""

  TRANSACTION_PARENT=""
  TRANSACTION_LOCK=""
  TRANSACTION_STAGE=""
  TRANSACTION_ROLLBACK=""
  TRANSACTION_JOURNAL=""
  if ! is_canonical_target_string "$target" || [ "${target##*/}" != "Crossway.app" ]; then
    set_transaction_failure 2 "internal_invariant_failed" \
      "Transaction layout requires one canonical Crossway target"
    return 1
  fi
  parent="$(/usr/bin/dirname "$target")" || return 1
  case "$parent" in
    /Applications|"$USER_HOME/Applications") ;;
    *)
      set_transaction_failure 2 "internal_invariant_failed" \
        "Transaction parent escaped the canonical Applications directories"
      return 1
      ;;
  esac
  TRANSACTION_PARENT="$parent"
  TRANSACTION_LOCK="$parent/.Crossway.agent-lock"
  TRANSACTION_STAGE="$parent/.Crossway.agent-stage"
  TRANSACTION_ROLLBACK="$parent/.Crossway.agent-rollback"
  TRANSACTION_JOURNAL="$parent/.Crossway.agent-journal"
  return 0
}

transaction_paths_are_valid() {
  local expected_parent=""

  if ! is_canonical_target_string "$SELECTED_TARGET" || \
    [ "${SELECTED_TARGET##*/}" != "Crossway.app" ]; then
    return 1
  fi
  expected_parent="$(/usr/bin/dirname "$SELECTED_TARGET")" || return 1
  case "$expected_parent" in
    /Applications|"$USER_HOME/Applications") ;;
    *) return 1 ;;
  esac
  [ "$TRANSACTION_PARENT" = "$expected_parent" ] && \
    [ "$TRANSACTION_LOCK" = "$expected_parent/.Crossway.agent-lock" ] && \
    [ "$TRANSACTION_STAGE" = "$expected_parent/.Crossway.agent-stage" ] && \
    [ "$TRANSACTION_ROLLBACK" = "$expected_parent/.Crossway.agent-rollback" ] && \
    [ "$TRANSACTION_JOURNAL" = "$expected_parent/.Crossway.agent-journal" ]
}

transaction_lock_is_owned() {
  local owner_file=""
  local recorded_owner=""

  transaction_paths_are_valid || return 1
  owner_file="$TRANSACTION_LOCK/owner"
  if [ -z "$TRANSACTION_LOCK_OWNER" ] || [ -L "$TRANSACTION_LOCK" ] || \
    [ ! -d "$TRANSACTION_LOCK" ] || [ -L "$owner_file" ] || \
    [ ! -f "$owner_file" ]; then
    return 1
  fi
  recorded_owner="$(/bin/cat "$owner_file" 2>/dev/null)" || return 1
  [ "$recorded_owner" = "$TRANSACTION_LOCK_OWNER" ]
}

filesystem_device() {
  /usr/bin/stat -f '%d' "$1" 2>/dev/null
}

acquire_transaction_lock() {
  local target="$1"
  local owner_file=""
  local mode=""
  local state_digest=""

  TRANSACTION_ERROR_OUTCOME=""
  TRANSACTION_ERROR_DETAIL=""
  compute_transaction_paths "$target" || return 1
  if [ ! -d "$TRANSACTION_PARENT" ] || [ -L "$TRANSACTION_PARENT" ] || \
    [ ! -w "$TRANSACTION_PARENT" ]; then
    set_transaction_failure 20 "target_not_writable" \
      "The selected Applications directory is unavailable or not writable"
    return 1
  fi
  if ! /bin/mkdir "$TRANSACTION_LOCK" 2>/dev/null; then
    if [ -d "$TRANSACTION_LOCK" ] && [ ! -L "$TRANSACTION_LOCK" ]; then
      set_transaction_failure 60 "busy" \
        "Another Crossway transaction owns the selected target"
    elif [ -e "$TRANSACTION_LOCK" ] || [ -L "$TRANSACTION_LOCK" ]; then
      set_transaction_failure 51 "recovery_required" \
        "Preserve the unknown object at the Crossway transaction lock path"
    else
      set_transaction_failure 20 "target_not_writable" \
        "The selected Applications directory cannot create a transaction lock"
    fi
    return 1
  fi
  if [ -L "$TRANSACTION_LOCK" ] || ! /bin/chmod 700 "$TRANSACTION_LOCK" 2>/dev/null; then
    set_transaction_failure 51 "recovery_required" \
      "The newly created Crossway transaction lock could not be secured"
    return 1
  fi
  mode="$(/usr/bin/stat -f '%Lp' "$TRANSACTION_LOCK" 2>/dev/null)" || mode=""
  if [ "$mode" != "700" ]; then
    set_transaction_failure 51 "recovery_required" \
      "The Crossway transaction lock permissions are ambiguous"
    return 1
  fi
  state_digest="$(/usr/bin/printf '%s' "$STATE_DIR" | /usr/bin/shasum -a 256 | \
    /usr/bin/sed -n '1s/[[:space:]].*$//p')" || state_digest=""
  if ! /usr/bin/printf '%s\n' "$state_digest" | \
    /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
    set_transaction_failure 51 "recovery_required" \
      "The Crossway transaction lock owner token could not be derived safely"
    return 1
  fi
  TRANSACTION_LOCK_OWNER="crossway-agent-v1:$$:${state_digest}"
  owner_file="$TRANSACTION_LOCK/owner"
  if ! /usr/bin/printf '%s\n' "$TRANSACTION_LOCK_OWNER" > "$owner_file" || \
    ! /bin/chmod 600 "$owner_file" 2>/dev/null; then
    set_transaction_failure 51 "recovery_required" \
      "The Crossway transaction lock owner could not be recorded"
    return 1
  fi
  return 0
}

release_transaction_lock() {
  local owner_file="$TRANSACTION_LOCK/owner"

  transaction_lock_is_owned || return 1
  /bin/rm -f -- "$owner_file" || return 1
  /bin/rmdir "$TRANSACTION_LOCK" || return 1
  TRANSACTION_LOCK_OWNER=""
  return 0
}

ensure_transaction_slots_clear() {
  local path=""

  if ! transaction_paths_are_valid; then
    set_transaction_failure 2 "internal_invariant_failed" \
      "Transaction artifact paths failed their fixed-layout validation"
    return 1
  fi
  for path in "$TRANSACTION_STAGE" "$TRANSACTION_ROLLBACK" "$TRANSACTION_JOURNAL"; do
    if [ -e "$path" ] || [ -L "$path" ]; then
      set_transaction_failure 51 "recovery_required" \
        "Preserve the existing Crossway transaction artifact: $path"
      return 1
    fi
  done
  return 0
}

write_transaction_journal_phase() {
  local phase="$1"
  local native_exit=0

  if ! transaction_lock_is_owned; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway transaction lock ownership could not be proved"
    return 1
  fi
  native_write_transaction_journal "$phase" >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_transaction_failure 20 "host_capability_required" \
        "Allow the helper to durably write the Crossway transaction journal"
    else
      set_transaction_failure 51 "recovery_required" \
        "Crossway transaction journal could not be written durably"
    fi
    return 1
  fi
  if [ -L "$TRANSACTION_JOURNAL" ] || [ ! -f "$TRANSACTION_JOURNAL" ] || \
    ! native_read_transaction_journal "$TRANSACTION_JOURNAL" >/dev/null; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway transaction journal could not be read back strictly"
    return 1
  fi
  return 0
}

stage_candidate_for_transaction() {
  local parent_device=""
  local stage_device=""
  local staged_fingerprint=""
  local expected_cdhash="$CANDIDATE_CDHASH"

  if ! transaction_lock_is_owned; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway transaction lock ownership could not be proved before staging"
    return 1
  fi
  ensure_transaction_slots_clear || return 1
  parent_device="$(filesystem_device "$TRANSACTION_PARENT")" || parent_device=""
  if [ -z "$parent_device" ] || ! /usr/bin/ditto "$CANDIDATE_PATH" \
    "$TRANSACTION_STAGE" 2>"${STATE_DIR}/stage-copy.stderr"; then
    set_transaction_failure 20 "target_not_writable" \
      "The verified Crossway candidate could not be staged beside the target"
    return 1
  fi
  if [ -L "$TRANSACTION_STAGE" ] || [ ! -d "$TRANSACTION_STAGE" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway staging produced an unsafe destination object"
    return 1
  fi
  stage_device="$(filesystem_device "$TRANSACTION_STAGE")" || stage_device=""
  if [ "$stage_device" != "$parent_device" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway staging did not remain on the destination volume"
    return 1
  fi
  if ! verify_candidate_gate "$TRANSACTION_STAGE" "staging"; then
    set_transaction_failure "$RELEASE_ERROR_EXIT" "$RELEASE_ERROR_OUTCOME" \
      "$RELEASE_ERROR_DETAIL"
    return 1
  fi
  if [ "$CANDIDATE_CDHASH" != "$expected_cdhash" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Staged Crossway code identity differs from the confirmation-bound candidate"
    return 1
  fi
  if ! fingerprint_bundle_tree "$TRANSACTION_STAGE"; then
    set_transaction_failure "$RELEASE_ERROR_EXIT" "$RELEASE_ERROR_OUTCOME" \
      "$RELEASE_ERROR_DETAIL"
    return 1
  fi
  staged_fingerprint="$TREE_FINGERPRINT"
  if [ "$staged_fingerprint" != "$CANDIDATE_FINGERPRINT" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Staged Crossway bytes differ from the confirmation-bound candidate"
    return 1
  fi
  write_transaction_journal_phase "staged"
}

set_execution_failure() {
  EXECUTION_EXIT="$1"
  EXECUTION_OUTCOME="$2"
  EXECUTION_DETAIL="$3"
  return 1
}

copy_transaction_failure_to_execution() {
  set_execution_failure "$TRANSACTION_ERROR_EXIT" "$TRANSACTION_ERROR_OUTCOME" \
    "$TRANSACTION_ERROR_DETAIL"
}

copy_release_failure_to_execution() {
  set_execution_failure "$RELEASE_ERROR_EXIT" "$RELEASE_ERROR_OUTCOME" \
    "$RELEASE_ERROR_DETAIL"
}

copy_lifecycle_failure_to_execution() {
  set_execution_failure "$LIFECYCLE_ERROR_EXIT" "$LIFECYCLE_ERROR_OUTCOME" \
    "$LIFECYCLE_ERROR_DETAIL"
}

ensure_apply_target_parent() {
  local parent=""
  local mode=""

  TARGET_PARENT_CREATED="false"
  compute_transaction_paths "$SELECTED_TARGET" || {
    copy_transaction_failure_to_execution
    return 1
  }
  parent="$TRANSACTION_PARENT"
  if [ -e "$parent" ] || [ -L "$parent" ]; then
    if [ -L "$parent" ] || [ ! -d "$parent" ] || [ ! -w "$parent" ] || \
      path_has_symlink_component "$parent"; then
      set_execution_failure 20 "target_not_writable" \
        "The confirmed Applications directory is not a safe writable directory"
      return 1
    fi
    return 0
  fi
  if [ "$parent" != "$USER_HOME/Applications" ] || [ ! -d "$USER_HOME" ] || \
    [ -L "$USER_HOME" ] || [ ! -w "$USER_HOME" ] || \
    path_has_symlink_component "$USER_HOME"; then
    set_execution_failure 20 "target_not_writable" \
      "Create or make writable the confirmed Applications directory without elevated privileges"
    return 1
  fi
  if ! /bin/mkdir "$parent" 2>/dev/null || [ -L "$parent" ] || \
    ! /bin/chmod 700 "$parent" 2>/dev/null; then
    set_execution_failure 20 "target_not_writable" \
      "The confirmed user Applications directory could not be created safely"
    return 1
  fi
  mode="$(/usr/bin/stat -f '%Lp' "$parent" 2>/dev/null)" || mode=""
  if [ "$mode" != "700" ]; then
    set_execution_failure 51 "recovery_required" \
      "The newly created user Applications directory has ambiguous permissions"
    return 1
  fi
  TARGET_PARENT_CREATED="true"
  return 0
}

release_lock_preserving_execution_failure() {
  local saved_exit="$EXECUTION_EXIT"
  local saved_outcome="$EXECUTION_OUTCOME"
  local saved_detail="$EXECUTION_DETAIL"

  if ! release_transaction_lock; then
    set_execution_failure 51 "recovery_required" \
      "Crossway transaction lock could not be released safely"
    return 1
  fi
  EXECUTION_EXIT="$saved_exit"
  EXECUTION_OUTCOME="$saved_outcome"
  EXECUTION_DETAIL="$saved_detail"
  return 0
}

verify_transaction_tree_fingerprint() {
  local path="$1"
  local expected="$2"
  local description="$3"

  if ! /usr/bin/printf '%s\n' "$expected" | \
    /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
    set_execution_failure 2 "internal_invariant_failed" \
      "$description fingerprint is not a SHA-256"
    return 1
  fi
  if [ -L "$path" ] || [ ! -d "$path" ] || ! fingerprint_bundle_tree "$path"; then
    set_execution_failure 51 "recovery_required" \
      "$description could not be fingerprinted without ambiguity"
    return 1
  fi
  if [ "$TREE_FINGERPRINT" != "$expected" ]; then
    set_execution_failure 51 "recovery_required" \
      "$description bytes changed during the confirmed transaction"
    return 1
  fi
  return 0
}

verify_prior_target_unchanged() {
  if [ "$INSTALLED_STATE" = "absent" ]; then
    if [ -e "$SELECTED_TARGET" ] || [ -L "$SELECTED_TARGET" ]; then
      set_execution_failure 10 "replan_required" \
        "The confirmed destination became occupied before staging"
      return 1
    fi
    return 0
  fi
  verify_transaction_tree_fingerprint "$SELECTED_TARGET" \
    "$INSTALLED_TREE_FINGERPRINT" "The prior Crossway app" || return 1
  return 0
}

move_transaction_bundle() {
  local source="$1"
  local destination="$2"
  local source_device=""
  local parent_device=""

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid; then
    set_execution_failure 51 "recovery_required" \
      "Transaction ownership or fixed paths changed before an app rename"
    return 1
  fi
  if ! { [ "$source" = "$SELECTED_TARGET" ] && \
      [ "$destination" = "$TRANSACTION_ROLLBACK" ]; } && \
    ! { [ "$source" = "$TRANSACTION_STAGE" ] && \
      [ "$destination" = "$SELECTED_TARGET" ]; }; then
    set_execution_failure 2 "internal_invariant_failed" \
      "Crossway transaction requested an unsupported app rename"
    return 1
  fi
  if [ -L "$source" ] || [ ! -d "$source" ] || \
    [ -e "$destination" ] || [ -L "$destination" ]; then
    set_execution_failure 51 "recovery_required" \
      "Crossway transaction rename paths are no longer unambiguous"
    return 1
  fi
  source_device="$(filesystem_device "$source")" || source_device=""
  parent_device="$(filesystem_device "$TRANSACTION_PARENT")" || parent_device=""
  if [ -z "$source_device" ] || [ "$source_device" != "$parent_device" ]; then
    set_execution_failure 51 "recovery_required" \
      "Crossway transaction rename is not confined to the target volume"
    return 1
  fi
  if ! /bin/mv "$source" "$destination" 2>"${STATE_DIR}/transaction-move.stderr" || \
    [ -e "$source" ] || [ -L "$source" ] || [ -L "$destination" ] || \
    [ ! -d "$destination" ]; then
    set_execution_failure 51 "recovery_required" \
      "Crossway transaction app rename did not complete atomically"
    return 1
  fi
  return 0
}

restore_target_changed_at_rename_boundary() {
  local changed_fingerprint=""

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid || \
    [ -L "$TRANSACTION_ROLLBACK" ] || [ ! -d "$TRANSACTION_ROLLBACK" ] || \
    ! fingerprint_bundle_tree "$TRANSACTION_ROLLBACK"; then
    set_execution_failure 51 "recovery_required" \
      "The app moved from the target cannot be restored without ambiguity"
    return 1
  fi
  changed_fingerprint="$TREE_FINGERPRINT"
  if ! move_recovery_rollback_to_target; then
    set_execution_failure 51 "recovery_required" \
      "The app changed at the rename boundary; preserve every transaction artifact"
    return 1
  fi
  if ! verify_transaction_tree_fingerprint "$SELECTED_TARGET" \
    "$changed_fingerprint" "The externally changed Crossway app"; then
    set_execution_failure 51 "recovery_required" \
      "The app changed again while restoring the rename-boundary conflict"
    return 1
  fi
  set_execution_failure 51 "recovery_required" \
    "The app changed at the rename boundary and was restored; preserve the stage, journal, and lock"
  return 1
}

remove_validated_transaction_tree() {
  local path="$1"
  local expected_fingerprint="$2"

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid || \
    { [ "$path" != "$TRANSACTION_ROLLBACK" ] && \
      [ "$path" != "$TRANSACTION_STAGE" ]; }; then
    set_execution_failure 51 "recovery_required" \
      "Recursive transaction cleanup target failed fixed-path validation"
    return 1
  fi
  if [ ! -e "$path" ] && [ ! -L "$path" ]; then
    return 0
  fi
  verify_transaction_tree_fingerprint "$path" "$expected_fingerprint" \
    "The retained Crossway transaction bundle" || return 1
  if ! /bin/rm -rf -- "$path" || [ -e "$path" ] || [ -L "$path" ]; then
    set_execution_failure 51 "recovery_required" \
      "Verified Crossway transaction bundle could not be removed"
    return 1
  fi
  return 0
}

sync_transaction_parent_for_commit() {
  local native_exit=0

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid; then
    set_execution_failure 51 "recovery_required" \
      "Transaction parent cannot be synchronized without exact lock ownership"
    return 1
  fi
  native_sync_transaction_parent >/dev/null || native_exit=$?
  if [ "$native_exit" -ne 0 ]; then
    if [ "$native_exit" -eq 20 ]; then
      set_execution_failure 20 "host_capability_required" \
        "Allow the helper to synchronize the Crossway transaction directory"
    else
      set_execution_failure 51 "recovery_required" \
        "Crossway transaction directory could not be synchronized"
    fi
    return 1
  fi
  return 0
}

remove_commit_ready_journal() {
  local phase=""

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid || \
    [ -L "$TRANSACTION_JOURNAL" ] || [ ! -f "$TRANSACTION_JOURNAL" ]; then
    set_execution_failure 51 "recovery_required" \
      "Commit-ready journal path failed strict cleanup validation"
    return 1
  fi
  if ! native_read_transaction_journal "$TRANSACTION_JOURNAL" >/dev/null; then
    set_execution_failure 51 "recovery_required" \
      "Commit-ready journal could not be parsed before cleanup"
    return 1
  fi
  phase="$(json_extract_raw "$NATIVE_RESPONSE" result.phase)" || phase=""
  if [ "$phase" != "commit-ready" ]; then
    set_execution_failure 51 "recovery_required" \
      "Transaction journal is not commit-ready for cleanup"
    return 1
  fi
  if ! /bin/rm -f -- "$TRANSACTION_JOURNAL" || \
    [ -e "$TRANSACTION_JOURNAL" ] || [ -L "$TRANSACTION_JOURNAL" ]; then
    set_execution_failure 51 "recovery_required" \
      "Commit-ready transaction journal could not be removed"
    return 1
  fi
  sync_transaction_parent_for_commit
}

set_execution_success_for_action() {
  case "$PLANNED_ACTION" in
    install) EXECUTION_OUTCOME="installed_running" ;;
    update|maintenance_update) EXECUTION_OUTCOME="updated_running" ;;
    repair) EXECUTION_OUTCOME="repaired_running" ;;
    launch) EXECUTION_OUTCOME="launched_current" ;;
    no_op) EXECUTION_OUTCOME="already_current_running" ;;
    *)
      set_execution_failure 2 "internal_invariant_failed" \
        "Confirmed execution completed an unknown action"
      return 1
      ;;
  esac
  EXECUTION_EXIT=0
  EXECUTION_DETAIL="The exact latest verified Crossway is running at $SELECTED_TARGET"
  case "$PLANNED_ACTION" in
    install|repair)
      EXECUTION_DETAIL="${EXECUTION_DETAIL}. If Crossway asks, complete its in-app onboarding"
      ;;
  esac
  return 0
}

execute_current_action() {
  local failure_exit=0
  local expected_cdhash="$CANDIDATE_CDHASH"

  if ! ensure_transaction_slots_clear; then
    copy_transaction_failure_to_execution
    release_lock_preserving_execution_failure || true
    return 1
  fi
  if ! verify_candidate_gate "$SELECTED_TARGET" "final"; then
    copy_release_failure_to_execution
    release_lock_preserving_execution_failure || true
    return 1
  fi
  if [ "$CANDIDATE_CDHASH" != "$expected_cdhash" ]; then
    set_execution_failure 10 "replan_required" \
      "The current Crossway code identity changed after confirmation"
    release_lock_preserving_execution_failure || true
    return 1
  fi
  case "$PLANNED_ACTION" in
    no_op)
      LIFECYCLE_ERROR_OUTCOME=""
      if ! inspect_exact_process "$INSTALLED_RUNNING_PID" "$SELECTED_TARGET"; then
        copy_lifecycle_failure_to_execution
        release_lock_preserving_execution_failure || true
        return 1
      fi
      if [ "$EXACT_PROCESS_STATE" != "running" ]; then
        set_execution_failure 20 "launch_health_failed" \
          "The confirmation-bound Crossway process is no longer running"
        release_lock_preserving_execution_failure || true
        return 1
      fi
      ;;
    launch)
      launch_exact_and_wait_health "$SELECTED_TARGET" "$CANDIDATE_VERSION" \
        "$CANDIDATE_BUILD" "" || failure_exit=$?
      if [ "$failure_exit" -ne 0 ]; then
        copy_lifecycle_failure_to_execution
        release_lock_preserving_execution_failure || true
        return 1
      fi
      ;;
    *)
      set_execution_failure 2 "internal_invariant_failed" \
        "Current-app execution received a replacement action"
      release_lock_preserving_execution_failure || true
      return 1
      ;;
  esac
  if ! release_transaction_lock; then
    set_execution_failure 51 "recovery_required" \
      "Healthy current Crossway could not release its transaction lock"
    return 1
  fi
  set_execution_success_for_action
}

execute_replacement_action() {
  local prior_pid=""
  local expected_cdhash="$CANDIDATE_CDHASH"

  verify_prior_target_unchanged || {
    release_lock_preserving_execution_failure || true
    return 1
  }
  if ! stage_candidate_for_transaction; then
    copy_transaction_failure_to_execution
    if [ -e "$TRANSACTION_STAGE" ] || [ -L "$TRANSACTION_STAGE" ] || \
      [ -e "$TRANSACTION_JOURNAL" ] || [ -L "$TRANSACTION_JOURNAL" ]; then
      set_execution_failure 51 "recovery_required" \
        "Preserve the failed Crossway stage and transaction lock for recovery"
    else
      release_lock_preserving_execution_failure || true
    fi
    return 1
  fi
  if ! verify_prior_target_unchanged; then
    set_execution_failure 51 "recovery_required" \
      "The prior Crossway changed after staging; preserve all transaction artifacts"
    return 1
  fi
  if [ "$INSTALLED_RUNNING" = "true" ]; then
    prior_pid="$INSTALLED_RUNNING_PID"
    if ! terminate_recorded_process "$prior_pid" "$SELECTED_TARGET"; then
      copy_lifecycle_failure_to_execution
      return 1
    fi
  fi
  if [ "$INSTALLED_STATE" != "absent" ]; then
    if ! write_transaction_journal_phase "old-moving"; then
      copy_transaction_failure_to_execution
      return 1
    fi
    move_transaction_bundle "$SELECTED_TARGET" "$TRANSACTION_ROLLBACK" || return 1
    if ! verify_transaction_tree_fingerprint "$TRANSACTION_ROLLBACK" \
      "$INSTALLED_TREE_FINGERPRINT" "The rollback Crossway app"; then
      restore_target_changed_at_rename_boundary || true
      return 1
    fi
  fi
  if ! write_transaction_journal_phase "new-moving"; then
    copy_transaction_failure_to_execution
    return 1
  fi
  move_transaction_bundle "$TRANSACTION_STAGE" "$SELECTED_TARGET" || return 1
  if ! write_transaction_journal_phase "new-at-target"; then
    copy_transaction_failure_to_execution
    return 1
  fi
  if ! verify_candidate_gate "$SELECTED_TARGET" "final"; then
    set_execution_failure 51 "recovery_required" \
      "Final-path Crossway gate failed; preserve the rollback and journal"
    return 1
  fi
  if [ "$CANDIDATE_CDHASH" != "$expected_cdhash" ]; then
    set_execution_failure 51 "recovery_required" \
      "Final Crossway code identity differs from the confirmation-bound candidate"
    return 1
  fi
  verify_transaction_tree_fingerprint "$SELECTED_TARGET" \
    "$CANDIDATE_FINGERPRINT" "The final Crossway app" || return 1
  if ! launch_exact_and_wait_health "$SELECTED_TARGET" "$CANDIDATE_VERSION" \
    "$CANDIDATE_BUILD" "$prior_pid"; then
    copy_lifecycle_failure_to_execution
    EXECUTION_EXIT=51
    EXECUTION_OUTCOME="recovery_required"
    EXECUTION_DETAIL="New Crossway launch health failed; preserve rollback and journal"
    return 1
  fi
  if ! write_transaction_journal_phase "commit-ready"; then
    copy_transaction_failure_to_execution
    return 1
  fi
  if [ "$INSTALLED_STATE" != "absent" ]; then
    remove_validated_transaction_tree "$TRANSACTION_ROLLBACK" \
      "$INSTALLED_TREE_FINGERPRINT" || return 1
    sync_transaction_parent_for_commit || return 1
  elif [ -e "$TRANSACTION_ROLLBACK" ] || [ -L "$TRANSACTION_ROLLBACK" ]; then
    set_execution_failure 51 "recovery_required" \
      "Fresh installation unexpectedly produced a rollback object"
    return 1
  fi
  remove_commit_ready_journal || return 1
  if ! release_transaction_lock; then
    set_execution_failure 51 "recovery_required" \
      "Committed Crossway could not release its exact transaction lock"
    return 1
  fi
  set_execution_success_for_action
}

execute_confirmed_plan() {
  local execution_exit=0

  EXECUTION_OUTCOME=""
  EXECUTION_DETAIL=""
  EXECUTION_EXIT=2

  ensure_apply_target_parent || return 1
  if ! acquire_transaction_lock "$SELECTED_TARGET"; then
    copy_transaction_failure_to_execution
    return 1
  fi
  case "$PLANNED_ACTION" in
    launch|no_op) execute_current_action ;;
    install|update|maintenance_update|repair)
      execute_replacement_action || execution_exit=$?
      if [ "$execution_exit" -ne 0 ] && transaction_lock_is_owned && \
        [ -f "$TRANSACTION_JOURNAL" ] && [ ! -L "$TRANSACTION_JOURNAL" ]; then
        if recover_owned_transaction; then
          if [ "$RECOVERY_EXIT" -eq 0 ]; then
            set_execution_success_for_action
            return $?
          fi
          EXECUTION_EXIT="$RECOVERY_EXIT"
          EXECUTION_OUTCOME="$RECOVERY_OUTCOME"
          EXECUTION_DETAIL="$RECOVERY_DETAIL"
        else
          set_execution_failure 51 "recovery_required" \
            "Automatic rollback could not prove restoration; preserve every transaction artifact"
        fi
      fi
      [ "$execution_exit" -eq 0 ]
      ;;
    *)
      set_execution_failure 2 "internal_invariant_failed" \
        "Confirmed plan selected an unsupported execution action"
      release_lock_preserving_execution_failure || true
      return 1
      ;;
  esac
}

read_transaction_lock_owner_pid() {
  local owner_file="$TRANSACTION_LOCK/owner"
  local owner_mode=""
  local owner_size=""
  local owner_record=""
  local owner_remainder=""
  local lock_mode=""

  RECOVERY_PRIOR_PID=""
  if ! transaction_paths_are_valid || [ -L "$TRANSACTION_LOCK" ] || \
    [ ! -d "$TRANSACTION_LOCK" ] || [ -L "$owner_file" ] || \
    [ ! -f "$owner_file" ]; then
    return 1
  fi
  lock_mode="$(/usr/bin/stat -f '%Lp' "$TRANSACTION_LOCK" 2>/dev/null)" || lock_mode=""
  owner_mode="$(/usr/bin/stat -f '%Lp' "$owner_file" 2>/dev/null)" || owner_mode=""
  owner_size="$(/usr/bin/stat -f '%z' "$owner_file" 2>/dev/null)" || owner_size=""
  if [ "$lock_mode" != "700" ] || [ "$owner_mode" != "600" ]; then
    return 1
  fi
  case "$owner_size" in
    ''|*[!0-9]*) return 1 ;;
  esac
  if [ "$owner_size" -lt 20 ] || [ "$owner_size" -gt 1024 ]; then
    return 1
  fi
  owner_record="$(/bin/cat "$owner_file" 2>/dev/null)" || return 1
  if ! /usr/bin/printf '%s\n' "$owner_record" | /usr/bin/grep -Eq \
      '^crossway-agent-v1:[1-9][0-9]*:[a-f0-9]{64}$'; then
    return 1
  fi
  owner_remainder="${owner_record#crossway-agent-v1:}"
  RECOVERY_PRIOR_PID="${owner_remainder%%:*}"
  case "$RECOVERY_PRIOR_PID" in
    ''|*[!0-9]*) RECOVERY_PRIOR_PID=""; return 1 ;;
  esac
  return 0
}

lock_owner_process_is_alive() {
  kill -0 "$1" 2>/dev/null
}

adopt_stale_transaction_lock() {
  local stale_pid=""
  local entry_count=""
  local owner_file="$TRANSACTION_LOCK/owner"

  TRANSACTION_ERROR_OUTCOME=""
  TRANSACTION_ERROR_DETAIL=""
  if ! read_transaction_lock_owner_pid; then
    set_transaction_failure 51 "recovery_required" \
      "Preserve the malformed Crossway transaction lock for manual recovery"
    return 1
  fi
  stale_pid="$RECOVERY_PRIOR_PID"
  if lock_owner_process_is_alive "$stale_pid"; then
    set_transaction_failure 60 "busy" \
      "Another Crossway transaction still owns the selected target"
    return 1
  fi
  entry_count="$(/usr/bin/find "$TRANSACTION_LOCK" -mindepth 1 -maxdepth 1 \
    -print 2>/dev/null | /usr/bin/wc -l | /usr/bin/tr -d '[:space:]')" || \
    entry_count=""
  if [ "$entry_count" != "1" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Preserve the Crossway transaction lock with unknown contents"
    return 1
  fi
  if ! /bin/rm -f -- "$owner_file" || ! /bin/rmdir "$TRANSACTION_LOCK"; then
    set_transaction_failure 51 "recovery_required" \
      "Stale Crossway transaction lock could not be taken over safely"
    return 1
  fi
  TRANSACTION_LOCK_OWNER=""
  acquire_transaction_lock "$SELECTED_TARGET"
}

load_transaction_journal() {
  local response=""
  local before_fingerprint=""
  local after_fingerprint=""
  local journal_mode=""

  RECOVERY_PHASE=""
  RECOVERY_PRIOR_FINGERPRINT=""
  RECOVERY_PRIOR_TREE_FINGERPRINT=""
  RECOVERY_CANDIDATE_FINGERPRINT=""
  RECOVERY_PRIOR_RUNNING="false"
  RECOVERY_PRIOR_PID=""
  RECOVERY_JOURNAL_FINGERPRINT=""
  if ! transaction_lock_is_owned || [ -L "$TRANSACTION_JOURNAL" ] || \
    [ ! -f "$TRANSACTION_JOURNAL" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway transaction journal cannot be trusted for automatic recovery"
    return 1
  fi
  journal_mode="$(/usr/bin/stat -f '%Lp' "$TRANSACTION_JOURNAL" 2>/dev/null)" || \
    journal_mode=""
  if [ "$journal_mode" != "600" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway transaction journal cannot be trusted for automatic recovery"
    return 1
  fi
  before_fingerprint="$(sha256_file_value "$TRANSACTION_JOURNAL")" || \
    before_fingerprint=""
  if [ -z "$before_fingerprint" ] || \
    ! native_read_transaction_journal "$TRANSACTION_JOURNAL" >/dev/null; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway transaction journal cannot be parsed for automatic recovery"
    return 1
  fi
  after_fingerprint="$(sha256_file_value "$TRANSACTION_JOURNAL")" || \
    after_fingerprint=""
  if [ -z "$before_fingerprint" ] || \
    [ "$before_fingerprint" != "$after_fingerprint" ]; then
    set_transaction_failure 51 "recovery_required" \
      "Crossway transaction journal changed while recovery was reading it"
    return 1
  fi
  RECOVERY_JOURNAL_FINGERPRINT="$after_fingerprint"
  response="$NATIVE_RESPONSE"
  RECOVERY_PHASE="$(json_extract_raw "$response" result.phase)" || RECOVERY_PHASE=""
  RECOVERY_PRIOR_FINGERPRINT="$(json_extract_raw "$response" result.installedFingerprint)" || \
    RECOVERY_PRIOR_FINGERPRINT=""
  RECOVERY_PRIOR_TREE_FINGERPRINT="$(json_extract_raw \
    "$response" result.installedTreeFingerprint)" || RECOVERY_PRIOR_TREE_FINGERPRINT=""
  RECOVERY_CANDIDATE_FINGERPRINT="$(json_extract_raw \
    "$response" result.candidateFingerprint)" || RECOVERY_CANDIDATE_FINGERPRINT=""
  RECOVERY_PRIOR_RUNNING="$(json_extract_raw "$response" result.priorRunning)" || \
    RECOVERY_PRIOR_RUNNING=""
  RECOVERY_PRIOR_PID="$(json_extract_optional_raw "$response" result.priorPid)"
  case "$RECOVERY_PHASE" in
    staged|old-moving|new-moving|new-at-target|commit-ready) ;;
    *) return 1 ;;
  esac
  if ! /usr/bin/printf '%s\n' "$RECOVERY_PRIOR_FINGERPRINT" | \
      /usr/bin/grep -Eq '^[a-f0-9]{64}$' || \
    ! /usr/bin/printf '%s\n' "$RECOVERY_CANDIDATE_FINGERPRINT" | \
      /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
    return 1
  fi
  case "$RECOVERY_PRIOR_TREE_FINGERPRINT" in
    absent) ;;
    *)
      if ! /usr/bin/printf '%s\n' "$RECOVERY_PRIOR_TREE_FINGERPRINT" | \
        /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
        return 1
      fi
      ;;
  esac
  case "$RECOVERY_PRIOR_RUNNING:$RECOVERY_PRIOR_PID" in
    false:) ;;
    true:[1-9][0-9]*) ;;
    *) return 1 ;;
  esac
  return 0
}

inspect_recovery_object() {
  local path="$1"
  local expected_fingerprint="$2"

  RECOVERY_OBJECT_STATE=""
  if [ ! -e "$path" ] && [ ! -L "$path" ]; then
    RECOVERY_OBJECT_STATE="absent"
    return 0
  fi
  if [ -L "$path" ] || [ ! -d "$path" ] || ! fingerprint_bundle_tree "$path"; then
    RECOVERY_OBJECT_STATE="unsafe"
    return 1
  fi
  if [ "$TREE_FINGERPRINT" = "$expected_fingerprint" ]; then
    RECOVERY_OBJECT_STATE="match"
  else
    RECOVERY_OBJECT_STATE="mismatch"
  fi
  return 0
}

ensure_recovery_candidate_stopped() {
  local selected_count=0
  local selected_pid=""
  local other_count=0

  enumerate_running_crossways || return 1
  if [ "$UNSAFE_RUNNING_COUNT" -gt 0 ]; then
    return 1
  fi
  if [ "$SELECTED_TARGET" = "$SYSTEM_TARGET" ]; then
    selected_count="$SYSTEM_RUNNING_COUNT"
    selected_pid="$SYSTEM_RUNNING_PID"
    other_count="$USER_RUNNING_COUNT"
  else
    selected_count="$USER_RUNNING_COUNT"
    selected_pid="$USER_RUNNING_PID"
    other_count="$SYSTEM_RUNNING_COUNT"
  fi
  if [ "$selected_count" -gt 1 ] || [ "$other_count" -gt 0 ]; then
    return 1
  fi
  if [ "$selected_count" -eq 1 ]; then
    terminate_recorded_process "$selected_pid" "$SELECTED_TARGET" || return 1
  fi
  return 0
}

remove_verified_recovery_candidate() {
  local path="$1"

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid || \
    { [ "$path" != "$SELECTED_TARGET" ] && [ "$path" != "$TRANSACTION_STAGE" ]; }; then
    return 1
  fi
  inspect_recovery_object "$path" "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
  if [ "$RECOVERY_OBJECT_STATE" = "absent" ]; then
    return 0
  fi
  if [ "$RECOVERY_OBJECT_STATE" != "match" ]; then
    return 1
  fi
  if [ "$path" = "$SELECTED_TARGET" ]; then
    ensure_recovery_candidate_stopped || return 1
  fi
  if ! /bin/rm -rf -- "$path" || [ -e "$path" ] || [ -L "$path" ]; then
    return 1
  fi
  sync_transaction_parent_for_commit
}

move_recovery_rollback_to_target() {
  local source_device=""
  local parent_device=""

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid || \
    [ -L "$TRANSACTION_ROLLBACK" ] || [ ! -d "$TRANSACTION_ROLLBACK" ] || \
    [ -e "$SELECTED_TARGET" ] || [ -L "$SELECTED_TARGET" ]; then
    return 1
  fi
  source_device="$(filesystem_device "$TRANSACTION_ROLLBACK")" || source_device=""
  parent_device="$(filesystem_device "$TRANSACTION_PARENT")" || parent_device=""
  if [ -z "$source_device" ] || [ "$source_device" != "$parent_device" ]; then
    return 1
  fi
  if ! /bin/mv "$TRANSACTION_ROLLBACK" "$SELECTED_TARGET" \
      2>"${STATE_DIR}/recovery-move.stderr" || \
    [ -e "$TRANSACTION_ROLLBACK" ] || [ -L "$TRANSACTION_ROLLBACK" ] || \
    [ -L "$SELECTED_TARGET" ] || [ ! -d "$SELECTED_TARGET" ]; then
    return 1
  fi
  sync_transaction_parent_for_commit
}

verify_restored_prior_app() {
  local inspect_exit=0

  inspect_recovery_object "$SELECTED_TARGET" \
    "$RECOVERY_PRIOR_TREE_FINGERPRINT" || return 1
  [ "$RECOVERY_OBJECT_STATE" = "match" ] || return 1
  enumerate_running_crossways || return 1
  inspect_installed_target "$SELECTED_TARGET" || inspect_exit=$?
  if [ "$inspect_exit" -ne 0 ]; then
    return 1
  fi
  case "$INSTALLED_STATE" in
    valid) ;;
    damaged_expected_identity)
      [ "$RECOVERY_PRIOR_RUNNING" = "false" ] || return 1
      ;;
    *) return 1 ;;
  esac
  RECOVERY_VERSION="$INSTALLED_VERSION"
  RECOVERY_BUILD="$INSTALLED_BUILD"
  return 0
}

ensure_recovery_prior_process_state() {
  local selected_count=0
  local selected_pid=""
  local other_count=0

  enumerate_running_crossways || return 1
  if [ "$UNSAFE_RUNNING_COUNT" -gt 0 ]; then
    return 1
  fi
  if [ "$SELECTED_TARGET" = "$SYSTEM_TARGET" ]; then
    selected_count="$SYSTEM_RUNNING_COUNT"
    selected_pid="$SYSTEM_RUNNING_PID"
    other_count="$USER_RUNNING_COUNT"
  else
    selected_count="$USER_RUNNING_COUNT"
    selected_pid="$USER_RUNNING_PID"
    other_count="$SYSTEM_RUNNING_COUNT"
  fi
  if [ "$selected_count" -gt 1 ] || [ "$other_count" -gt 0 ]; then
    return 1
  fi
  if [ "$RECOVERY_PRIOR_RUNNING" = "false" ]; then
    [ "$selected_count" -eq 0 ]
    return $?
  fi
  if [ "$selected_count" -eq 1 ]; then
    inspect_exact_process "$selected_pid" "$SELECTED_TARGET" || return 1
    [ "$EXACT_PROCESS_STATE" = "running" ]
    return $?
  fi
  launch_exact_and_wait_health "$SELECTED_TARGET" "$RECOVERY_VERSION" \
    "$RECOVERY_BUILD" ""
}

verify_recovery_candidate_at_target() {
  local response=""
  local prior_installed_state="$INSTALLED_STATE"

  inspect_recovery_object "$SELECTED_TARGET" \
    "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
  [ "$RECOVERY_OBJECT_STATE" = "match" ] || return 1
  native_read_bundle_info "$SELECTED_TARGET" >/dev/null || return 1
  response="$NATIVE_RESPONSE"
  RECOVERY_VERSION="$(json_extract_optional_raw "$response" result.shortVersion)"
  RECOVERY_BUILD="$(json_extract_optional_raw "$response" result.buildVersion)"
  if ! /usr/bin/printf '%s\n' "$RECOVERY_VERSION" | \
      /usr/bin/grep -Eq '^[0-9]+\.[0-9]+(\.[0-9]+)*$' || \
    ! /usr/bin/printf '%s\n' "$RECOVERY_BUILD" | \
      /usr/bin/grep -Eq '^[0-9]+$'; then
    return 1
  fi
  RELEASE_TAG="v${RECOVERY_VERSION}-b${RECOVERY_BUILD}"
  INSTALLED_STATE="absent"
  if ! verify_candidate_gate "$SELECTED_TARGET" "recovery"; then
    INSTALLED_STATE="$prior_installed_state"
    return 1
  fi
  INSTALLED_STATE="$prior_installed_state"
  inspect_recovery_object "$SELECTED_TARGET" \
    "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
  [ "$RECOVERY_OBJECT_STATE" = "match" ]
}

ensure_recovery_candidate_running() {
  local selected_count=0
  local selected_pid=""
  local other_count=0

  enumerate_running_crossways || return 1
  if [ "$UNSAFE_RUNNING_COUNT" -gt 0 ]; then
    return 1
  fi
  if [ "$SELECTED_TARGET" = "$SYSTEM_TARGET" ]; then
    selected_count="$SYSTEM_RUNNING_COUNT"
    selected_pid="$SYSTEM_RUNNING_PID"
    other_count="$USER_RUNNING_COUNT"
  else
    selected_count="$USER_RUNNING_COUNT"
    selected_pid="$USER_RUNNING_PID"
    other_count="$SYSTEM_RUNNING_COUNT"
  fi
  if [ "$selected_count" -gt 1 ] || [ "$other_count" -gt 0 ]; then
    return 1
  fi
  if [ "$selected_count" -eq 1 ]; then
    inspect_exact_process "$selected_pid" "$SELECTED_TARGET" || return 1
    [ "$EXACT_PROCESS_STATE" = "running" ]
    return $?
  fi
  launch_exact_and_wait_health "$SELECTED_TARGET" "$RECOVERY_VERSION" \
    "$RECOVERY_BUILD" ""
}

remove_recovered_transaction_journal() {
  local current_fingerprint=""

  if ! transaction_lock_is_owned || ! transaction_paths_are_valid || \
    [ -L "$TRANSACTION_JOURNAL" ] || [ ! -f "$TRANSACTION_JOURNAL" ]; then
    return 1
  fi
  current_fingerprint="$(sha256_file_value "$TRANSACTION_JOURNAL")" || \
    current_fingerprint=""
  if [ -z "$RECOVERY_JOURNAL_FINGERPRINT" ] || \
    [ "$current_fingerprint" != "$RECOVERY_JOURNAL_FINGERPRINT" ]; then
    return 1
  fi
  if ! /bin/rm -f -- "$TRANSACTION_JOURNAL" || \
    [ -e "$TRANSACTION_JOURNAL" ] || [ -L "$TRANSACTION_JOURNAL" ]; then
    return 1
  fi
  sync_transaction_parent_for_commit
}

finish_loaded_rollback() {
  local target_prior_state=""
  local rollback_prior_state=""
  local target_candidate_state=""
  local stage_candidate_state=""
  local prior_count=0
  local candidate_count=0

  if [ "$RECOVERY_PRIOR_TREE_FINGERPRINT" = "absent" ]; then
    inspect_recovery_object "$TRANSACTION_ROLLBACK" \
      "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
    [ "$RECOVERY_OBJECT_STATE" = "absent" ] || return 1
    inspect_recovery_object "$SELECTED_TARGET" \
      "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
    target_candidate_state="$RECOVERY_OBJECT_STATE"
    inspect_recovery_object "$TRANSACTION_STAGE" \
      "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
    stage_candidate_state="$RECOVERY_OBJECT_STATE"
    [ "$target_candidate_state" = "match" ] && candidate_count=$((candidate_count + 1))
    [ "$stage_candidate_state" = "match" ] && candidate_count=$((candidate_count + 1))
    [ "$candidate_count" -le 1 ] || return 1
    [ "$target_candidate_state" = "absent" ] || \
      remove_verified_recovery_candidate "$SELECTED_TARGET" || return 1
    [ "$stage_candidate_state" = "absent" ] || \
      remove_verified_recovery_candidate "$TRANSACTION_STAGE" || return 1
    if [ -e "$SELECTED_TARGET" ] || [ -L "$SELECTED_TARGET" ]; then
      return 1
    fi
  else
    inspect_recovery_object "$SELECTED_TARGET" \
      "$RECOVERY_PRIOR_TREE_FINGERPRINT" || return 1
    target_prior_state="$RECOVERY_OBJECT_STATE"
    inspect_recovery_object "$TRANSACTION_ROLLBACK" \
      "$RECOVERY_PRIOR_TREE_FINGERPRINT" || return 1
    rollback_prior_state="$RECOVERY_OBJECT_STATE"
    [ "$target_prior_state" = "match" ] && prior_count=$((prior_count + 1))
    [ "$rollback_prior_state" = "match" ] && prior_count=$((prior_count + 1))
    [ "$prior_count" -eq 1 ] || return 1

    inspect_recovery_object "$TRANSACTION_STAGE" \
      "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
    stage_candidate_state="$RECOVERY_OBJECT_STATE"
    if [ "$target_prior_state" = "match" ]; then
      [ "$rollback_prior_state" = "absent" ] || return 1
    else
      inspect_recovery_object "$SELECTED_TARGET" \
        "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
      target_candidate_state="$RECOVERY_OBJECT_STATE"
      case "$target_candidate_state" in
        match) candidate_count=$((candidate_count + 1)) ;;
        absent) ;;
        *) return 1 ;;
      esac
    fi
    case "$stage_candidate_state" in
      match) candidate_count=$((candidate_count + 1)) ;;
      absent) ;;
      *) return 1 ;;
    esac
    [ "$candidate_count" -le 1 ] || return 1
    [ "$target_candidate_state" != "match" ] || \
      remove_verified_recovery_candidate "$SELECTED_TARGET" || return 1
    [ "$stage_candidate_state" != "match" ] || \
      remove_verified_recovery_candidate "$TRANSACTION_STAGE" || return 1
    if [ "$rollback_prior_state" = "match" ]; then
      move_recovery_rollback_to_target || return 1
    fi
    verify_restored_prior_app || return 1
    ensure_recovery_prior_process_state || return 1
  fi
  remove_recovered_transaction_journal || return 1
  release_transaction_lock || return 1
  RECOVERY_HANDLED="true"
  RECOVERY_EXIT=50
  RECOVERY_OUTCOME="install_failed_rolled_back"
  RECOVERY_DETAIL="The prior Crossway state was restored after an interrupted install"
  return 0
}

finish_loaded_commit() {
  local rollback_state=""

  inspect_recovery_object "$TRANSACTION_STAGE" \
    "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
  [ "$RECOVERY_OBJECT_STATE" = "absent" ] || return 1
  verify_recovery_candidate_at_target || return 1
  ensure_recovery_candidate_running || return 1
  if [ "$RECOVERY_PRIOR_TREE_FINGERPRINT" = "absent" ]; then
    inspect_recovery_object "$TRANSACTION_ROLLBACK" \
      "$RECOVERY_CANDIDATE_FINGERPRINT" || return 1
    [ "$RECOVERY_OBJECT_STATE" = "absent" ] || return 1
  else
    inspect_recovery_object "$TRANSACTION_ROLLBACK" \
      "$RECOVERY_PRIOR_TREE_FINGERPRINT" || return 1
    rollback_state="$RECOVERY_OBJECT_STATE"
    if [ "$rollback_state" = "match" ]; then
      remove_validated_transaction_tree "$TRANSACTION_ROLLBACK" \
        "$RECOVERY_PRIOR_TREE_FINGERPRINT" || return 1
      sync_transaction_parent_for_commit || return 1
    elif [ "$rollback_state" != "absent" ]; then
      return 1
    fi
  fi
  remove_recovered_transaction_journal || return 1
  release_transaction_lock || return 1
  RECOVERY_HANDLED="true"
  RECOVERY_EXIT=0
  RECOVERY_OUTCOME="already_current_running"
  RECOVERY_DETAIL="The previously committed Crossway transaction finished cleanup"
  return 0
}

recover_owned_transaction() {
  if ! load_transaction_journal; then
    return 1
  fi
  if [ "$RECOVERY_PHASE" = "commit-ready" ]; then
    finish_loaded_commit
  else
    finish_loaded_rollback
  fi
}

classify_diagnosis_evidence() {
  local installed_state="$1"
  local running="$2"
  local writable="$3"
  local gate_exit="$4"
  local gate_text="$5"
  local platform_state="$6"
  local version_state="$7"

  DIAGNOSIS_CODE=""
  DIAGNOSIS_DETAIL=""
  case "$installed_state" in
    wrong_identity)
      DIAGNOSIS_CODE="identity_mismatch"
      DIAGNOSIS_DETAIL="The canonical target is occupied by an app with the wrong identity"
      return 0
      ;;
    damaged_expected_identity)
      if [ "$running" = "true" ]; then
        DIAGNOSIS_CODE="damaged_running_unknown"
        DIAGNOSIS_DETAIL="Quit the damaged running app manually before repair"
      else
        DIAGNOSIS_CODE="broken_seal"
        DIAGNOSIS_DETAIL="Crossway has the expected identity but its signed bundle is damaged"
      fi
      return 0
      ;;
    absent)
      if [ "$writable" = "true" ]; then
        DIAGNOSIS_CODE="not_installed"
        DIAGNOSIS_DETAIL="No Crossway app is installed at the selected canonical target"
      else
        DIAGNOSIS_CODE="target_not_writable"
        DIAGNOSIS_DETAIL="The selected canonical Applications directory is not writable"
      fi
      return 0
      ;;
    valid) ;;
    *) return 1 ;;
  esac
  case "$platform_state" in
    incompatible_os)
      DIAGNOSIS_CODE="incompatible_os"
      DIAGNOSIS_DETAIL="This Crossway build requires a newer macOS version"
      return 0
      ;;
    incompatible_architecture)
      DIAGNOSIS_CODE="incompatible_architecture"
      DIAGNOSIS_DETAIL="This Crossway build does not contain the host architecture"
      return 0
      ;;
    compatible) ;;
    *) return 1 ;;
  esac
  if [ "$gate_exit" != "0" ]; then
    if /usr/bin/printf '%s\n' "$gate_text" | \
        /usr/bin/grep -Eiq 'File created by an AppSandbox|exec/open not allowed'; then
      DIAGNOSIS_CODE="hard_quarantine"
      DIAGNOSIS_DETAIL="A sandboxed transfer app applied hard quarantine to Crossway"
    elif /usr/bin/printf '%s\n' "$gate_text" | \
        /usr/bin/grep -Eiq 'operation not permitted|sandbox restriction|permission denied'; then
      DIAGNOSIS_CODE="gatekeeper_not_observable"
      DIAGNOSIS_DETAIL="Allow the helper to run a read-only Gatekeeper assessment"
    elif /usr/bin/printf '%s\n' "$gate_text" | \
        /usr/bin/grep -Eiq 'not downloaded from the App Store|App Store only'; then
      DIAGNOSIS_CODE="gatekeeper_app_store_only"
      DIAGNOSIS_DETAIL="Gatekeeper is configured to allow App Store apps only"
    elif /usr/bin/printf '%s\n' "$gate_text" | \
        /usr/bin/grep -Eiq 'cannot (be )?check(ed)? (it )?for malicious software|ticket|staple'; then
      DIAGNOSIS_CODE="lost_staple_likely"
      DIAGNOSIS_DETAIL="Notarization ticket evidence appears to have been lost in transit"
    else
      DIAGNOSIS_CODE="notarization_rejected"
      DIAGNOSIS_DETAIL="Gatekeeper rejected the installed Crossway app"
    fi
    return 0
  fi
  case "$version_state" in
    older) DIAGNOSIS_CODE="healthy_older" ;;
    current) DIAGNOSIS_CODE="healthy_current" ;;
    newer) DIAGNOSIS_CODE="healthy_newer" ;;
    unchecked) DIAGNOSIS_CODE="healthy_version_unchecked" ;;
    *) return 1 ;;
  esac
  DIAGNOSIS_DETAIL="Crossway passes local identity and Gatekeeper checks; privacy permissions are not observable"
  return 0
}

diagnose_selected_target() {
  local writable="false"
  local gate_exit=0
  local gate_output="${STATE_DIR}/diagnose-gatekeeper.txt"
  local gate_text=""

  if [ -w "$(/usr/bin/dirname "$SELECTED_TARGET")" ]; then
    writable="true"
  fi
  if [ "$INSTALLED_STATE" = "valid" ]; then
    run_gatekeeper_assessment "$SELECTED_TARGET" "$gate_output" || gate_exit=$?
    gate_text="$(/bin/cat "$gate_output" 2>/dev/null)" || gate_text=""
  fi
  classify_diagnosis_evidence "$INSTALLED_STATE" "$INSTALLED_RUNNING" \
    "$writable" "$gate_exit" "$gate_text" compatible unchecked
}

set_recovery_failure() {
  RECOVERY_HANDLED="false"
  RECOVERY_EXIT="$1"
  RECOVERY_OUTCOME="$2"
  RECOVERY_DETAIL="$3"
  return 1
}

recovery_artifacts_exist_in_parent() {
  local parent="$1"
  local artifact=""

  for artifact in "$parent/.Crossway.agent-lock" \
    "$parent/.Crossway.agent-stage" "$parent/.Crossway.agent-rollback" \
    "$parent/.Crossway.agent-journal"; do
    if [ -e "$artifact" ] || [ -L "$artifact" ]; then
      return 0
    fi
  done
  return 1
}

recover_interrupted_apply() {
  local explicit_target="$1"
  local normalize_exit=0
  local system_pending=0
  local user_pending=0

  RECOVERY_HANDLED="false"
  RECOVERY_EXIT=0
  RECOVERY_OUTCOME=""
  RECOVERY_DETAIL=""
  RECOVERY_VERSION=""
  if [ -n "$explicit_target" ]; then
    normalize_explicit_target "$explicit_target" || normalize_exit=$?
    case "$normalize_exit" in
      0) ;;
      20)
        set_recovery_failure 20 "host_capability_required" "$PREFLIGHT_DETAIL"
        return 1
        ;;
      *)
        set_recovery_failure 10 "target_choice_required" "$PREFLIGHT_DETAIL"
        return 1
        ;;
    esac
  else
    recovery_artifacts_exist_in_parent "/Applications" && system_pending=1
    recovery_artifacts_exist_in_parent "$USER_HOME/Applications" && user_pending=1
    if [ "$system_pending" -eq 0 ] && [ "$user_pending" -eq 0 ]; then
      return 0
    fi
    if [ "$system_pending" -eq 1 ] && [ "$user_pending" -eq 1 ]; then
      set_recovery_failure 10 "target_choice_required" \
        "Choose the canonical Crossway target whose interrupted transaction should recover"
      return 1
    fi
    if [ "$system_pending" -eq 1 ]; then
      SELECTED_TARGET="$SYSTEM_TARGET"
    else
      SELECTED_TARGET="$USER_TARGET"
    fi
  fi

  compute_transaction_paths "$SELECTED_TARGET" || {
    set_recovery_failure "$TRANSACTION_ERROR_EXIT" "$TRANSACTION_ERROR_OUTCOME" \
      "$TRANSACTION_ERROR_DETAIL"
    return 1
  }
  if ! recovery_artifacts_exist_in_parent "$TRANSACTION_PARENT"; then
    return 0
  fi
  if [ ! -e "$TRANSACTION_JOURNAL" ] && [ ! -L "$TRANSACTION_JOURNAL" ]; then
    if { [ -d "$TRANSACTION_LOCK" ] && [ ! -L "$TRANSACTION_LOCK" ]; } && \
      [ ! -e "$TRANSACTION_STAGE" ] && [ ! -L "$TRANSACTION_STAGE" ] && \
      [ ! -e "$TRANSACTION_ROLLBACK" ] && [ ! -L "$TRANSACTION_ROLLBACK" ]; then
      if adopt_stale_transaction_lock && release_transaction_lock; then
        return 0
      fi
      set_recovery_failure "$TRANSACTION_ERROR_EXIT" "$TRANSACTION_ERROR_OUTCOME" \
        "$TRANSACTION_ERROR_DETAIL"
      return 1
    fi
    set_recovery_failure 51 "recovery_required" \
      "Transaction artifacts without a strict journal must be preserved"
    return 1
  fi
  if [ -L "$TRANSACTION_JOURNAL" ] || [ ! -f "$TRANSACTION_JOURNAL" ]; then
    set_recovery_failure 51 "recovery_required" \
      "The transaction journal path is not one regular file"
    return 1
  fi
  if [ -e "$TRANSACTION_LOCK" ] || [ -L "$TRANSACTION_LOCK" ]; then
    if ! adopt_stale_transaction_lock; then
      set_recovery_failure "$TRANSACTION_ERROR_EXIT" "$TRANSACTION_ERROR_OUTCOME" \
        "$TRANSACTION_ERROR_DETAIL"
      return 1
    fi
  elif ! acquire_transaction_lock "$SELECTED_TARGET"; then
    set_recovery_failure "$TRANSACTION_ERROR_EXIT" "$TRANSACTION_ERROR_OUTCOME" \
      "$TRANSACTION_ERROR_DETAIL"
    return 1
  fi
  if ! recover_owned_transaction; then
    set_recovery_failure 51 "recovery_required" \
      "Automatic Crossway transaction recovery could not prove a safe result"
    return 1
  fi
  return 0
}

handle_transaction_signal() {
  local signal_name="$1"

  trap - INT TERM HUP
  if transaction_lock_is_owned && [ -f "$TRANSACTION_JOURNAL" ] && \
    [ ! -L "$TRANSACTION_JOURNAL" ] && recover_owned_transaction; then
    emit_result "$RECOVERY_OUTCOME" "apply" "$SELECTED_TARGET" "$RECOVERY_VERSION" \
      "" "not_observable" "" "Interrupted by $signal_name; $RECOVERY_DETAIL"
    cleanup_private_state
    exit "$RECOVERY_EXIT"
  fi
  if [ -z "$TRANSACTION_PARENT" ] || \
    ! recovery_artifacts_exist_in_parent "$TRANSACTION_PARENT"; then
    emit_result "user_action_required" "$ACTIVE_COMMAND" "$SELECTED_TARGET" "" "" \
      "not_observable" "" \
      "Interrupted by $signal_name before any Crossway installation mutation"
    cleanup_private_state
    exit 20
  fi
  emit_result "recovery_required" "apply" "$SELECTED_TARGET" "" "" \
    "not_observable" "" \
    "Interrupted by $signal_name; preserve all Crossway transaction artifacts"
  cleanup_private_state
  exit 51
}

resolve_local_target() {
  local explicit_target="$1"
  local system_exists=0
  local user_exists=0
  local system_writable=0
  local normalize_exit=0
  local running_exit=0

  if [ -n "$explicit_target" ]; then
    normalize_explicit_target "$explicit_target" || normalize_exit=$?
    if [ "$normalize_exit" -ne 0 ]; then
      return "$normalize_exit"
    fi
    explicit_target="$SELECTED_TARGET"
  fi

  enumerate_running_crossways || running_exit=$?
  if [ "$running_exit" -ne 0 ]; then
    if [ "$running_exit" -eq 20 ]; then
      return 20
    fi
    PREFLIGHT_DETAIL="Running-application data did not match the native adapter contract"
    return 2
  fi
  if [ "$UNSAFE_RUNNING_COUNT" -gt 0 ]; then
    PREFLIGHT_DETAIL="Quit the non-canonical Crossway copy before continuing (${UNSAFE_RUNNING_DETAIL})"
    return 21
  fi
  if [ "$SYSTEM_RUNNING_COUNT" -gt 1 ] || [ "$USER_RUNNING_COUNT" -gt 1 ]; then
    PREFLIGHT_DETAIL="More than one Crossway process is running from the same install"
    return 21
  fi

  system_exists="$(canonical_target_exists "$SYSTEM_TARGET")"
  user_exists="$(canonical_target_exists "$USER_TARGET")"
  system_writable="$(system_target_parent_writable)"
  choose_target_from_state "$explicit_target" "$system_exists" "$user_exists" \
    "$SYSTEM_RUNNING_COUNT" "$USER_RUNNING_COUNT" "$system_writable"
}

diagnosis_detail() {
  /usr/bin/printf 'target_reason=%s;installed_state=%s;running=%s;canonical_installs=%s' \
    "$TARGET_REASON" "$INSTALLED_STATE" "$INSTALLED_RUNNING" "$TARGET_DUPLICATE_COUNT"
}

inspect_local_state() {
  local action="$1"
  local explicit_target="$2"
  local resolve_exit=0
  local inspect_exit=0
  local detail=""

  resolve_local_target "$explicit_target" || resolve_exit=$?
  case "$resolve_exit" in
    0) ;;
    2)
      finish 2 "internal_invariant_failed" "$action" "$explicit_target" "" "" \
        "not_observable" "" "$PREFLIGHT_DETAIL"
      ;;
    10)
      finish 10 "target_choice_required" "$action" "$explicit_target" "" "" \
        "not_observable" "" "$PREFLIGHT_DETAIL"
      ;;
    20)
      finish 20 "host_capability_required" "$action" "$explicit_target" "" "" \
        "not_observable" "" "$PREFLIGHT_DETAIL"
      ;;
    21)
      finish 20 "unsafe_running_copy" "$action" "$explicit_target" "" "" \
        "not_observable" "" "$PREFLIGHT_DETAIL"
      ;;
    *)
      finish 2 "internal_invariant_failed" "$action" "$explicit_target" "" "" \
        "not_observable" "" "Unknown target-resolution state"
      ;;
  esac

  inspect_installed_target "$SELECTED_TARGET" || inspect_exit=$?
  if [ "$inspect_exit" -ne 0 ]; then
    if [ "$inspect_exit" -eq 20 ]; then
      finish 20 "host_capability_required" "$action" "$SELECTED_TARGET" "" "" \
        "not_observable" "" "$PREFLIGHT_DETAIL"
    fi
    finish 2 "internal_invariant_failed" "$action" "$SELECTED_TARGET" "" "" \
      "not_observable" "" "Installed-app inspection contract failed"
  fi
  if [ "$INSTALLED_STATE" = "wrong_identity" ] && [ "$action" != "diagnose" ]; then
    finish 20 "user_action_required" "$action" "$SELECTED_TARGET" "$INSTALLED_VERSION" "" \
      "not_observable" "" "Preserve the unrecognized occupant and choose or remove it manually"
  fi
  if [ "$INSTALLED_STATE" = "damaged_expected_identity" ] && \
    [ "$INSTALLED_RUNNING" = "true" ] && [ "$action" != "diagnose" ]; then
    finish 20 "user_action_required" "$action" "$SELECTED_TARGET" "$INSTALLED_VERSION" "" \
      "not_observable" "" "Quit the damaged app manually because its running identity cannot be verified"
  fi

  report_spotlight_diagnostics
  detail="$(diagnosis_detail)"
  if [ "$action" = "diagnose" ]; then
    if ! diagnose_selected_target; then
      finish 2 "internal_invariant_failed" "$action" "$SELECTED_TARGET" \
        "$INSTALLED_VERSION" "" "not_observable" "" \
        "Read-only diagnosis classifier received invalid evidence"
    fi
    if [ "$DIAGNOSIS_CODE" = "gatekeeper_not_observable" ]; then
      finish 20 "host_capability_required" "$action" "$SELECTED_TARGET" \
        "$INSTALLED_VERSION" "" "not_observable" "" "$DIAGNOSIS_DETAIL"
    fi
    detail="${detail};diagnosis=${DIAGNOSIS_CODE};diagnosis_detail=${DIAGNOSIS_DETAIL}"
    /usr/bin/printf '%s: target=%s diagnosis=%s\n' \
      "$PROGRAM_NAME" "$SELECTED_TARGET" "$DIAGNOSIS_CODE" >&2
    finish 0 "diagnosed" "$action" "$SELECTED_TARGET" "$INSTALLED_VERSION" "" \
      "not_observable" "" "$detail"
  fi
}

parse_read_only_command() {
  local action="$1"
  shift
  local target=""
  local target_seen=0
  local plan_detail=""

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --target)
        if [ "$target_seen" -eq 1 ]; then
          usage_error "$action" "$target" "--target may be provided only once"
        fi
        if [ "$#" -lt 2 ] || [ -z "$2" ]; then
          usage_error "$action" "$target" "--target requires a non-empty path"
        fi
        target="$2"
        target_seen=1
        shift 2
        ;;
      --target=*)
        usage_error "$action" "$target" "use --target as a separate argument"
        ;;
      --help|-h)
        usage >&2
        finish 0 "help" "$action" "$target" "" "" "" "" ""
        ;;
      *)
        usage_error "$action" "$target" "unknown option: $1"
        ;;
    esac
  done

  if ! host_preflight; then
    /usr/bin/printf '%s: %s\n' "$PROGRAM_NAME" "$PREFLIGHT_DETAIL" >&2
    finish "$PREFLIGHT_EXIT" "$PREFLIGHT_OUTCOME" "$action" "$target" "" "" \
      "not_observable" "" "$PREFLIGHT_DETAIL"
  fi

  if [ "$action" = "diagnose" ]; then
    inspect_local_state "$action" "$target"
    finish 2 "internal_invariant_failed" "$action" "$target" "" "" \
      "not_observable" "" "diagnose returned without a final result"
  fi

  if ! build_verified_plan "$action" "$target"; then
    finish_verified_plan_failure "$action"
  fi
  emit_confirmation_checklist
  plan_detail="planned_action=${PLANNED_ACTION};process_impact=${PROCESS_IMPACT}"
  if [ -n "$REPAIR_REASON" ]; then
    plan_detail="${plan_detail};repair_reason=${REPAIR_REASON}"
  fi
  finish 10 "confirmation_required" "$action" "$SELECTED_TARGET" \
    "$CANDIDATE_VERSION" "$RELEASE_TAG" "not_observable" "$COMPUTED_PLAN_ID" \
    "$plan_detail"
}

parse_apply_command() {
  local target=""
  local target_seen=0
  local expected_plan_id=""
  local expected_seen=0
  local confirmed_seen=0

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --target)
        if [ "$target_seen" -eq 1 ]; then
          usage_error "apply" "$target" "--target may be provided only once"
        fi
        if [ "$#" -lt 2 ] || [ -z "$2" ]; then
          usage_error "apply" "$target" "--target requires a non-empty path"
        fi
        target="$2"
        target_seen=1
        shift 2
        ;;
      --expected-plan-id)
        if [ "$expected_seen" -eq 1 ]; then
          usage_error "apply" "$target" "--expected-plan-id may be provided only once"
        fi
        if [ "$#" -lt 2 ] || ! /usr/bin/printf '%s\n' "$2" | \
          /usr/bin/grep -Eq '^[a-f0-9]{64}$'; then
          usage_error "apply" "$target" "--expected-plan-id requires one lowercase SHA-256"
        fi
        expected_plan_id="$2"
        expected_seen=1
        shift 2
        ;;
      --confirmed)
        if [ "$confirmed_seen" -eq 1 ]; then
          usage_error "apply" "$target" "--confirmed may be provided only once"
        fi
        confirmed_seen=1
        shift
        ;;
      --target=*|--expected-plan-id=*|--confirmed=*)
        usage_error "apply" "$target" "apply options require the documented separate-argument form"
        ;;
      --help|-h)
        usage >&2
        finish 0 "help" "apply" "$target" "" "" "" "" ""
        ;;
      *)
        usage_error "apply" "$target" "unknown option: $1"
        ;;
    esac
  done
  if [ "$expected_seen" -ne 1 ] || [ "$confirmed_seen" -ne 1 ]; then
    usage_error "apply" "$target" \
      "apply requires both --expected-plan-id <sha256> and --confirmed"
  fi

  if ! host_preflight; then
    /usr/bin/printf '%s: %s\n' "$PROGRAM_NAME" "$PREFLIGHT_DETAIL" >&2
    finish "$PREFLIGHT_EXIT" "$PREFLIGHT_OUTCOME" "apply" "$target" "" "" \
      "not_observable" "" "$PREFLIGHT_DETAIL"
  fi
  if ! recover_interrupted_apply "$target"; then
    /usr/bin/printf '%s: %s\n' "$PROGRAM_NAME" "$RECOVERY_DETAIL" >&2
    finish "$RECOVERY_EXIT" "$RECOVERY_OUTCOME" "apply" "$SELECTED_TARGET" \
      "$RECOVERY_VERSION" "" "not_observable" "" "$RECOVERY_DETAIL"
  fi
  if [ "$RECOVERY_HANDLED" = "true" ]; then
    /usr/bin/printf '%s: %s\n' "$PROGRAM_NAME" "$RECOVERY_DETAIL" >&2
    finish "$RECOVERY_EXIT" "$RECOVERY_OUTCOME" "apply" "$SELECTED_TARGET" \
      "$RECOVERY_VERSION" "" "not_observable" "" "$RECOVERY_DETAIL"
  fi
  if ! build_verified_plan "apply" "$target"; then
    finish_verified_plan_failure "apply"
  fi
  if [ "$COMPUTED_PLAN_ID" != "$expected_plan_id" ]; then
    /usr/bin/printf '%s: verified state changed; a new plan and confirmation are required\n' \
      "$PROGRAM_NAME" >&2
    finish 10 "replan_required" "apply" "$SELECTED_TARGET" "$CANDIDATE_VERSION" \
      "$RELEASE_TAG" "not_observable" "" \
      "The target, installed app, release, candidate, or process impact changed"
  fi

  if ! execute_confirmed_plan; then
    /usr/bin/printf '%s: %s\n' "$PROGRAM_NAME" "$EXECUTION_DETAIL" >&2
    finish "$EXECUTION_EXIT" "$EXECUTION_OUTCOME" "apply" "$SELECTED_TARGET" \
      "$CANDIDATE_VERSION" "$RELEASE_TAG" "not_observable" "$COMPUTED_PLAN_ID" \
      "$EXECUTION_DETAIL"
  fi
  /usr/bin/printf '%s: latest verified Crossway is running at %s\n' \
    "$PROGRAM_NAME" "$SELECTED_TARGET" >&2
  finish 0 "$EXECUTION_OUTCOME" "apply" "$SELECTED_TARGET" "$CANDIDATE_VERSION" \
    "$RELEASE_TAG" "not_observable" "$COMPUTED_PLAN_ID" "$EXECUTION_DETAIL"
}

main() {
  if [ "$#" -eq 0 ]; then
    usage_error "" "" "missing command"
  fi

  local command="$1"
  shift
  ACTIVE_COMMAND="$command"

  case "$command" in
    diagnose|plan)
      parse_read_only_command "$command" "$@"
      ;;
    --help|-h|help)
      if [ "$#" -ne 0 ]; then
        usage_error "help" "" "help takes no arguments"
      fi
      usage >&2
      finish 0 "help" "help" "" "" "" "" "" ""
      ;;
    apply)
      parse_apply_command "$@"
      ;;
    *)
      usage_error "$command" "" "unknown command: $command"
      ;;
  esac
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  trap cleanup_private_state EXIT
  trap 'handle_transaction_signal INT' INT
  trap 'handle_transaction_signal TERM' TERM
  trap 'handle_transaction_signal HUP' HUP
  main "$@"
fi
