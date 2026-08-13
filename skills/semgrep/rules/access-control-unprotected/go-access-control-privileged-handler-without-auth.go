// skills/semgrep/rules/access-control-unprotected/go-access-control-privileged-handler-without-auth.go
// Incident-rooted (gala-games dormant minter, hedgey unvalidated privileged call).

package accesscontrol

type ctx struct{ caller string }

type Service struct {
	balances map[string]int
	owner    string
}

func (s *Service) isOwner(c ctx) bool { return c.caller == s.owner }

// ruleid: go-access-control-privileged-handler-without-auth
func (s *Service) Mint(to string, amt int) {
	s.balances[to] += amt
}

// ok: go-access-control-privileged-handler-without-auth
func (s *Service) MintGuarded(to string, amt int) {
	if !s.isOwner(ctx{}) {
		return
	}
	s.balances[to] += amt
}
