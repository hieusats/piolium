package sample

type Mask struct {
	Publics []int
}

func threshold() int64                  { return 1 }
func (uv *uniformVerifier) threshold() int64 { return 1 }
func (uv *uniformVerifier) enabled(i int) bool { return true }

type uniformVerifier struct{}

func (uv *uniformVerifier) isQuorumAchieved(mask *Mask) bool {
	// ruleid: piolium-go-quorum-counts-roster-size-not-signers
	got := int64(len(mask.Publics))
	return got > uv.threshold()
}

func (uv *uniformVerifier) isQuorumAchievedSafe(mask *Mask) bool {
	// ok: piolium-go-quorum-counts-roster-size-not-signers
	var n int64
	for i := range mask.Publics {
		if uv.enabled(i) {
			n++
		}
	}
	return n >= uv.threshold()
}

func verifyCommitteeSignatures(signatures [][]byte) bool {
	// ruleid: piolium-go-quorum-counts-roster-size-not-signers
	return len(signatures) >= threshold()
}

func verifyEachSignature(sigs [][]byte) bool {
	// ok: piolium-go-quorum-counts-roster-size-not-signers
	for _, s := range sigs {
		if !verifyOne(s) {
			return false
		}
	}
	return true
}

func verifyOne(s []byte) bool { return true }
