#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

[ -f .config ] || {
	echo "!! .config not found. Start from a preset, e.g.:" >&2
	echo "     cp defconfig/c2000-ultra.config .config" >&2
	exit 1
}

if [ ! -s private-key.pem ] || [ ! -s public-key.pem ]; then
	command -v openssl >/dev/null 2>&1 || {
		echo "!! openssl not found, cannot create the apk signing keys" >&2; exit 1; }
	openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem
	openssl ec -in private-key.pem -pubout -out public-key.pem 2>/dev/null
	echo "created apk signing keys"
fi

REV="$(./scripts/getver.sh)"
case "${REV##*-}" in
[0-9]*) ;;
*)
	echo "!! scripts/getver.sh returned '$REV'." >&2
	echo "   base-files would be packaged as version '<release>~${REV##*-}'," >&2
	echo "   which apk rejects, so the image cannot be built." >&2
	echo "   Fix: keep the .git directory, or ship a 'version' file at the top" >&2
	echo "   of the tree containing a string like r0-69fe2f9." >&2
	exit 1
	;;
esac

cfg() { sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" .config 2>/dev/null | head -1; }

[ -d package/feeds ] || echo "!! package/feeds is missing - run ./scripts/feeds update -a && ./scripts/feeds install -a" >&2

make defconfig

BOARD=$(cfg CONFIG_TARGET_BOARD)
SUBTARGET=$(cfg CONFIG_TARGET_SUBTARGET)
DEVICES=$(sed -n 's/^CONFIG_TARGET_DEVICE_[^=]*_DEVICE_\(.*\)=y$/\1/p' .config | sort | tr '\n' ' ')
[ -n "$BOARD" ] && [ -n "$SUBTARGET" ] || { echo "!! .config has no target" >&2; exit 1; }
OUTDIR="bin/targets/$BOARD/$SUBTARGET"

echo
echo "  board     : $BOARD"
echo "  subtarget : $SUBTARGET"
echo "  devices   : ${DEVICES:-<none>}"
echo "  revision  : $REV"
echo "  jobs      : $(nproc)"

echo
echo "############ build, first pass $(date '+%F %T') ############"
make -j"$(nproc)"

echo
echo "############ build, second pass $(date '+%F %T') ############"
R=$(ls -d staging_dir/target-*/root-mediatek 2>/dev/null | head -1)
rm -f staging_dir/target-*/stamp/.target_install
rm -f staging_dir/target-*/stamp/.package_install
rm -f build_dir/target-*/linux-mediatek_filogic/root.squashfs*
mkdir -p "$OUTDIR"
rm -f "$OUTDIR"/*.tar "$OUTDIR"/*.bin
[ -n "$R" ] && cp -a files/. "$R/" 2>/dev/null || true
make -j"$(nproc)"

echo
echo "############ result $(date '+%F %T') ############"
ls -l "$OUTDIR"/*.tar 2>/dev/null || { echo "!! no .tar produced in $OUTDIR" >&2; exit 1; }
md5sum "$OUTDIR"/*.tar
