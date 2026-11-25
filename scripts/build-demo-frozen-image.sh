#!/usr/bin/env bash
# Path: /scripts/build-demo-frozen-image.sh

set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly SOURCE_COMMIT="${1:-}"
readonly -a BUILD_CONFIG_PATHS=(
  Dockerfile.demo-frozen
  .dockerignore
  package.json
)
readonly -a REQUIRED_BUILD_PATHS=(
  "${BUILD_CONFIG_PATHS[@]}"
  pnpm-lock.yaml
)

if [[ ! "${SOURCE_COMMIT}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: scripts/build-demo-frozen-image.sh <40-character-source-commit>" >&2
  exit 64
fi

for command_name in docker git sha256sum tar; do
  command -v "${command_name}" >/dev/null || {
    echo "required command is unavailable: ${command_name}" >&2
    exit 69
  }
done

cd -- "${REPO_ROOT}"

[[ "$(git branch --show-current)" == "main" ]] || {
  echo "refusing build outside main" >&2
  exit 65
}

readonly HEAD_COMMIT="$(git rev-parse HEAD)"
[[ "${SOURCE_COMMIT}" == "${HEAD_COMMIT}" ]] || {
  echo "source commit must equal the current main HEAD" >&2
  exit 65
}

git rev-parse --verify --quiet "${SOURCE_COMMIT}^{commit}" >/dev/null || {
  echo "source commit is not available locally" >&2
  exit 65
}

for required_path in "${REQUIRED_BUILD_PATHS[@]}"; do
  git cat-file -e "${SOURCE_COMMIT}:${required_path}" 2>/dev/null || {
    echo "source commit lacks required build path: ${required_path}" >&2
    exit 65
  }
done

readonly IMAGE_REF="begasist-suite-demo:git-${SOURCE_COMMIT}"
if docker image inspect "${IMAGE_REF}" >/dev/null 2>&1; then
  echo "refusing to overwrite existing image tag: ${IMAGE_REF}" >&2
  exit 73
fi

readonly BUILD_CONTEXT="$(mktemp -d "${TMPDIR:-/tmp}/begasist-demo-build.XXXXXX")"

cleanup() {
  if [[ -n "${BUILD_CONTEXT:-}" && "${BUILD_CONTEXT}" == "${TMPDIR:-/tmp}"/begasist-demo-build.* ]]; then
    rm -rf -- "${BUILD_CONTEXT}"
  fi
}
trap cleanup EXIT

git archive --format=tar "${SOURCE_COMMIT}" | tar -xf - -C "${BUILD_CONTEXT}"

readonly SOURCE_TREE="$(git rev-parse "${SOURCE_COMMIT}^{tree}")"
readonly LOCKFILE_SHA256="$(sha256sum "${BUILD_CONTEXT}/pnpm-lock.yaml" | awk '{print $1}')"
readonly BUILD_CONFIG_SHA256="$(
  cd -- "${BUILD_CONTEXT}"
  sha256sum -- "${BUILD_CONFIG_PATHS[@]}" | sha256sum | awk '{print $1}'
)"

docker build \
  --file "${BUILD_CONTEXT}/Dockerfile.demo-frozen" \
  --tag "${IMAGE_REF}" \
  --build-arg "SOURCE_COMMIT=${SOURCE_COMMIT}" \
  --build-arg "SOURCE_TREE=${SOURCE_TREE}" \
  --build-arg "LOCKFILE_SHA256=${LOCKFILE_SHA256}" \
  --build-arg "BUILD_CONFIG_SHA256=${BUILD_CONFIG_SHA256}" \
  "${BUILD_CONTEXT}"

readonly IMAGE_ID="$(docker image inspect --format '{{.Id}}' "${IMAGE_REF}")"
readonly IMAGE_REVISION="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "${IMAGE_REF}")"
readonly REPO_DIGESTS="$(docker image inspect --format '{{json .RepoDigests}}' "${IMAGE_REF}")"

[[ "${IMAGE_REVISION}" == "${SOURCE_COMMIT}" ]] || {
  echo "built image revision label does not match source commit" >&2
  exit 70
}

printf 'source_commit=%s\n' "${SOURCE_COMMIT}"
printf 'source_tree=%s\n' "${SOURCE_TREE}"
printf 'image_ref=%s\n' "${IMAGE_REF}"
printf 'image_id=%s\n' "${IMAGE_ID}"
printf 'repo_digests=%s\n' "${REPO_DIGESTS}"
printf 'lockfile_sha256=%s\n' "${LOCKFILE_SHA256}"
printf 'build_config_sha256=%s\n' "${BUILD_CONFIG_SHA256}"
