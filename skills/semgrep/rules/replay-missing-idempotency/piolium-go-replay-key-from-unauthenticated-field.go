package sample

import "fmt"

type CXProof struct {
	Header      *Header
	MerkleProof MerkleProof
}
type MerkleProof struct {
	ShardID  uint32
	BlockNum uint64
}
type Header struct{ n uint64 }

func (h *Header) Hash() [32]byte { return [32]byte{} }
func (h *Header) Number() uint64 { return h.n }
func (h *Header) ShardID() uint32 { return 0 }

// Vulnerable: spent key derived from unauthenticated MerkleProof.ShardID.
func isSpentMutableShardID(p *CXProof) bool {
	// ruleid: piolium-go-replay-key-from-unauthenticated-field
	shardID := p.MerkleProof.ShardID
	return seen(shardID, 0)
}

// Vulnerable: spent key derived from unauthenticated MerkleProof.BlockNum.
func isSpentMutableBlockNum(p *CXProof) bool {
	// ruleid: piolium-go-replay-key-from-unauthenticated-field
	blockNum := p.MerkleProof.BlockNum
	return seen(0, blockNum)
}

// Safe: key derived from the signed header (authenticated) ShardID/Number.
func isSpentSafe(p *CXProof) bool {
	// ok: piolium-go-replay-key-from-unauthenticated-field
	shardID := p.Header.ShardID()
	blockNum := p.Header.Number()
	return seen(shardID, blockNum)
}

// Safe: key is the signed header hash directly.
func isSpentHashSafe(p *CXProof) bool {
	// ok: piolium-go-replay-key-from-unauthenticated-field
	key := p.Header.Hash()
	return seenKey(key)
}

func seen(s uint32, b uint64) bool { return false }
func seenKey(k [32]byte) bool      { return false }
var _ = fmt.Sprint
