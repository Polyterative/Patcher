#!/usr/bin/env bash
# Hosted-target confirmation for owner-run ops scripts (sourced, not executed;
# needs lib/pg-common.sh sourced first).
#
# confirm_target_or_exit <url> <phrase> <is_hosted_flag 0|1>
#   - Target carries the self-host marker and the URL does not look hosted:
#     proceed silently (refuses a stray --target-is-hosted as a likely mix-up).
#   - Otherwise (hosted-looking URL, or no marker): require --target-is-hosted
#     AND the exact phrase typed interactively on /dev/tty. CONFIRM_PHRASE in the
#     environment replaces the prompt — for drill/tests only.
# Connection strings are only ever printed masked.

confirm_target_or_exit() {
  local url="$1" phrase="$2" flag="$3" rc=0 typed=""
  local masked
  masked="$(mask_db_url "${url}")"
  if ! looks_hosted_url "${url}"; then
    has_selfhost_marker "${url}" || rc=$?
    if [ "${rc}" -eq 2 ]; then
      echo "ERROR: could not connect to the target to verify it." >&2
      exit 1
    fi
    if [ "${rc}" -eq 0 ]; then
      if [ "${flag}" -eq 1 ]; then
        echo "ERROR: --target-is-hosted given, but the target carries the '${PATCHER_SELFHOST_MARKER_ROLE}' role (self-host). Refusing the mix-up." >&2
        exit 1
      fi
      echo "Target: ${masked} (self-host marker present)"
      return 0
    fi
  fi
  echo "Target: ${masked}"
  echo "This target looks HOSTED (hosted-looking URL or no '${PATCHER_SELFHOST_MARKER_ROLE}' role)."
  if [ "${flag}" -ne 1 ]; then
    echo "ERROR: refusing without --target-is-hosted (owner-run, owner present)." >&2
    exit 1
  fi
  if [ -n "${CONFIRM_PHRASE:-}" ]; then
    typed="${CONFIRM_PHRASE}"
  elif { exec 9</dev/tty; } 2>/dev/null; then
    printf 'Type "%s" to continue: ' "${phrase}" > /dev/tty
    IFS= read -r typed <&9 || typed=""
    exec 9<&-
  else
    echo "ERROR: no terminal to confirm on; refusing." >&2
    exit 1
  fi
  if [ "${typed}" != "${phrase}" ]; then
    echo "ERROR: confirmation phrase did not match; nothing was done." >&2
    exit 1
  fi
}
