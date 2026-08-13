package sample

type Block struct{ num uint64 }

func (b *Block) NumberU64() uint64 { return b.num }

// Vulnerable: seal verified only at batch boundaries, not per-block.
func verifySealBatch(b *Block, verifyAll bool) bool {
	// ruleid: piolium-go-verification-gated-by-batch-position
	shouldVerify := b.NumberU64()%100 == 0 || verifyAll
	if !shouldVerify {
		return true
	}
	return doSealCheck(b)
}

// Safe: every block's seal is verified unconditionally.
func verifySealEvery(b *Block) bool {
	// ok: piolium-go-verification-gated-by-batch-position
	return doSealCheck(b)
}

// Safe (legit modulo, not gating verification): batching logger.
func logBatch(b *Block) {
	// ok: piolium-go-verification-gated-by-batch-position
	if b.NumberU64()%1000 == 0 {
		print("checkpoint")
	}
}

func doSealCheck(b *Block) bool { return true }
func print(s string)            {}
