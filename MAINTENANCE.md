# Maintenance

## Releasing

Use conventional commits for changes (prefix with `feat:`, `fix:`, `docs:`, etc.):

```bash
# Preview changelog before release
npm run release:dry

# Release (updates changelog, bumps version, pushes, publishes)
npm run release:patch   # 0.1.0 → 0.1.1
npm run release:minor   # 0.1.0 → 0.2.0
npm run release:major   # 0.1.0 → 1.0.0
```
