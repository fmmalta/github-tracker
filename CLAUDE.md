## Design Context

### Users
**Primary audience:** Executives and engineering leadership (CTOs, VPs of Engineering, Directors). They access this dashboard to get a high-level read on engineering health — PR throughput, review velocity, developer output — and surface it in leadership reviews or 1:1s. They are time-constrained and need clarity at a glance, not exploration. They expect the tool to feel as premium as the decisions they're making with it.

### Brand Personality
**Precise · Trustworthy · Efficient**

This is a tool that handles sensitive team performance data. The interface must feel authoritative without being intimidating, and polished without being showy. Like a Bloomberg terminal that's been designed by someone who cares about craft.

### Aesthetic Direction
**Dark mode, sleek — inspired by Linear.**

- Full dark mode. Background: near-black (`#0a0a0f`), surfaces: `#13131a` / `#1a1a24`
- Sidebar: deep dark, subtly distinct from main content
- Typography: Inter, tighter letter-spacing, confident weight hierarchy
- Accent color: indigo (`#6366f1` / `#818cf8`) used sparingly — interactive elements and active states only
- Cards: subtle border (`1px solid rgba(255,255,255,0.07)`), no heavy shadows
- NO: MUI default blue (#1976d2), pastel gradients, playful icons, cluttered chrome

**Anti-references:** Jira, colorful SaaS, generic MUI out-of-the-box, Grafana wall-of-panels
**Reference:** Linear — dark, typographically precise, every element earns its place

### Design Principles

1. **Data is the hero.** Numbers are large, labels are small. Remove chrome that competes with data.
2. **Earn trust through restraint.** One accent color. No decorative color. No gradients unless serving data.
3. **Density without clutter.** Use spacing and subtle separators, not boxes-within-boxes.
4. **Dark by design.** Surfaces layer with opacity and brightness, not heavy borders or shadows.
5. **Typographic hierarchy does the work.** Bold numbers, medium labels, light secondary text.

### Token Reference

```
background.default:  #0a0a0f
background.paper:    #13131a
surface.elevated:    #1a1a24
divider:             rgba(255, 255, 255, 0.07)
primary.main:        #6366f1
primary.light:       #818cf8
text.primary:        #f1f5f9
text.secondary:      #64748b
success.main:        #22c55e
error.main:          #ef4444
border-radius:       8px cards / 6px inputs / 4px chips
```
