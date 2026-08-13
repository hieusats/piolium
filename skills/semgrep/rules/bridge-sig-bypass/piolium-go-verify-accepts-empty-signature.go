package sample

func verifySig(sig []byte, msg []byte) bool {
	// ruleid: piolium-go-verify-accepts-empty-signature
	if len(sig) == 0 {
		return true
	}
	return doBLSVerify(sig, msg)
}

func checkCommitSignature(commit []byte) (bool, error) {
	// ruleid: piolium-go-verify-accepts-empty-signature
	if len(commit) == 0 {
		return true, nil
	}
	return doBLSVerify(commit, nil), nil
}

func verifySigSafe(sig []byte, msg []byte) bool {
	// ok: piolium-go-verify-accepts-empty-signature
	if len(sig) == 0 {
		return false
	}
	return doBLSVerify(sig, msg)
}

func checkCommitSafe(commit []byte) (bool, error) {
	// ok: piolium-go-verify-accepts-empty-signature
	if len(commit) == 0 {
		return false, fmt.Errorf("empty commit signature")
	}
	return doBLSVerify(commit, nil), nil
}

func doBLSVerify(s []byte, m []byte) bool { return true }
