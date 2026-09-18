#!/usr/bin/env bash

# 安全发布：默认只检查；--push 时只收已跟踪改动，未跟踪路径必须显式传入。
set -Eeuo pipefail

# RimWorld 仅发布到 GitHub；origin（Gitee）保留为历史备份，不参与发布。
REMOTES=(github)

network_git() {
  # Codex 的隔离 PowerShell 身份无法使用 Schannel；仅网络 Git 命令改走 Git for Windows 自带 OpenSSL。
  git -c http.sslBackend=openssl "$@"
}

die() {
  echo "错误：$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
用法：
  bash release.sh
  bash release.sh --push "提交说明" [-- 未跟踪路径 ...]
  bash release.sh --push-only

不带参数时只展示改动、分支、远端并检查远端读取连通性。
--push 会暂存全部已跟踪文件的修改/删除；未跟踪文件或目录必须放在 -- 后明确指定。
--push-only 只推送当前分支已有的提交，不暂存、不提交，也不处理未跟踪文件。
脚本不会使用 git add -A、--force 或自动重试。
EOF
}

require_repository() {
  local root
  root="$(git rev-parse --show-toplevel 2>/dev/null)" || die "当前目录不在 Git 仓库中。"
  cd "$root"
}

require_clean_index() {
  git diff --cached --quiet || die "暂存区已有内容；请先人工检查或处理，脚本不会接管已有暂存。"
}

current_branch() {
  git symbolic-ref --quiet --short HEAD 2>/dev/null || die "当前处于 detached HEAD，不能发布。"
}

show_local_state() {
  echo "== 工作区改动 =="
  git status --short
  echo
  echo "== 已跟踪文件改动统计 =="
  git diff --stat
  echo
  echo "== 当前分支 =="
  git branch --show-current
  echo
  echo "== 目标远端 =="
  for remote in "${REMOTES[@]}"; do
    printf '%s -> %s\n' "$remote" "$(git remote get-url "$remote")"
  done
}

check_remotes() {
  local remote failed=0
  echo
  echo "== 远端读取/凭据预检 =="
  for remote in "${REMOTES[@]}"; do
    printf '检查 %s...\n' "$remote"
    if network_git ls-remote "$remote" HEAD >/dev/null; then
      printf '%s：可访问\n' "$remote"
    else
      printf '%s：不可访问\n' "$remote" >&2
      failed=1
    fi
  done
  return "$failed"
}

stage_explicit_untracked() {
  local path state
  for path in "$@"; do
    [[ -e "$path" ]] || die "指定路径不存在：$path"
    state="$(git status --porcelain=v1 --untracked-files=all -- "$path")"
    [[ "$state" == "?? "* ]] || die "只能在 -- 后指定未跟踪路径：$path"
    git add -- "$path"
  done
}

publish() {
  local message="$1"
  shift
  local branch remote
  local -a pushed=()

  require_clean_index
  show_local_state
  check_remotes || die "远端预检失败；未暂存、未提交、未推送。"

  branch="$(current_branch)"
  git add -u
  stage_explicit_untracked "$@"
  git diff --cached --quiet && die "没有可提交的改动。"

  echo
  echo "== 本次将提交的改动 =="
  git diff --cached --stat
  git commit -m "$message"

  for remote in "${REMOTES[@]}"; do
    printf '\n推送到 %s...\n' "$remote"
    if network_git push "$remote" "HEAD:refs/heads/$branch"; then
      pushed+=("$remote")
    else
      echo "推送到 $remote 失败。" >&2
      if ((${#pushed[@]} > 0)); then
        echo "已成功推送：${pushed[*]}" >&2
        echo "补推命令：git push $remote HEAD:refs/heads/$branch" >&2
      fi
      exit 1
    fi
  done

  echo "发布完成：${pushed[*]}"
}

push_only() {
  local branch remote local_head remote_head
  local -a pushed=()

  require_clean_index
  show_local_state
  check_remotes || die "远端预检失败；未推送。"

  branch="$(current_branch)"
  local_head="$(git rev-parse HEAD)"
  echo
  echo "== 当前 HEAD =="
  printf '%s %s\n' "$branch" "$local_head"
  echo
  echo "== 待推状态 =="
  for remote in "${REMOTES[@]}"; do
    remote_head="$(network_git ls-remote --heads "$remote" "refs/heads/$branch" | awk '{print $1}')"
    if [[ -z "$remote_head" ]]; then
      printf '%s：远端暂无 %s，待推 %s\n' "$remote" "$branch" "$local_head"
    elif [[ "$remote_head" == "$local_head" ]]; then
      printf '%s：已同步 %s\n' "$remote" "$local_head"
    else
      printf '%s：待推 %s（远端为 %s）\n' "$remote" "$local_head" "$remote_head"
    fi
  done

  for remote in "${REMOTES[@]}"; do
    printf '\n推送当前 HEAD 到 %s...\n' "$remote"
    if network_git push "$remote" "HEAD:refs/heads/$branch"; then
      pushed+=("$remote")
    else
      echo "推送到 $remote 失败。" >&2
      if ((${#pushed[@]} > 0)); then
        echo "已成功推送：${pushed[*]}" >&2
        echo "待补推远端：$remote" >&2
        echo "补推命令：bash release.sh --push-only" >&2
      fi
      exit 1
    fi
  done

  echo "仅推送完成：${pushed[*]}"
}

main() {
  require_repository
  for remote in "${REMOTES[@]}"; do
    git remote get-url "$remote" >/dev/null || die "未配置目标远端：$remote"
  done

  if (($# == 0)); then
    show_local_state
    check_remotes
    return
  fi

  if (($# == 1)) && [[ "$1" == "--push-only" ]]; then
    push_only
    return
  fi

  [[ "$1" == "--push" ]] || { usage; exit 2; }
  (($# >= 2)) || { usage; exit 2; }
  [[ -n "$2" ]] || die "提交说明不能为空。"
  local message="$2"
  shift 2
  if (($# > 0)); then
    [[ "$1" == "--" ]] || { usage; exit 2; }
    shift
  fi
  publish "$message" "$@"
}

main "$@"
