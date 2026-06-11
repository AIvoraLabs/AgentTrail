# Propuesta: Compliance Test Strategy

## Intención

AgentTrail tiene 169 tests unitarios con mocks, pero ningún test demuestra el sistema funcionando de principio a fin ante un AUDITOR. Necesitamos un framework E2E que genere receipts reales, hash chains reales, file I/O real, y escenarios multi-agente reales para probar cumplimiento con EU AI Act Artículo 12.

## Alcance

### In Scope
- 5 suites E2E nuevas (8-12) + 5 helper classes OOP + types/barrel
- 4 devDependencies: `@faker-js/faker`, `fast-check`, `proper-lockfile`, `async-mutex`
- JSDoc en todo método público con `@param`, `@returns`, `@throws`, `@example`
- Zero cambios a código de producción

### Out of Scope
- mitata benchmarks, Pino logging, Roughtime, Estonia OÜ, Merkle trees
- Nuevas integraciones (LangChain, Anthropic, Google AI)

## Capacidades

> Basado en `openspec/specs/` existentes: `openai-integration`, `vercel-ai-integration`, `storage-backend`, `metadata-validation`.

### Nuevas Capacidades
- `compliance-e2e-testing`: Framework OOP de testing E2E para compliance EU AI Act. Helper classes reutilizables (TestHarness, AgentSimulator, ReceiptVerifier, FormatGenerator), escenarios de concurrencia, formatos reales, simulación multi-provider.

### Capacidades Modificadas
None — cambio puro de infraestructura de testing, sin alterar requirements de specs existentes.

## Enfoque

Dos capas: (1) helpers OOP con responsabilidad única encapsulan setup/verificación/simulación/datos, (2) suites E2E importan helpers. Cada suite prueba un aspecto compliance: hash chain intacto, PII redactado, timestamps monotónicos, firmas válidas, concurrencia. Tests con LLM real se saltan si falta `GROQ_API_KEY`.

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `packages/core/__tests__/helpers/` | Nuevo | 5 helpers + types + barrel (7 archivos) |
| `packages/core/__tests__/e2e/` | Nuevo | 5 suites E2E |
| `packages/core/package.json` | Modificado | +4 devDependencies |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Groq API cambia | Baja | Tests skip si falla conexión inicial |
| Concurrencia: falsos positivos en CI | Media | `async-mutex` para locking determinístico |
| Volumen 500+ receipts lento en CI | Alta | Suite marcada con skip condicional |

## Rollback

`git checkout main -- packages/core/ && pnpm install`

## Dependencias

- `@faker-js/faker`, `fast-check`, `proper-lockfile`, `async-mutex`
- `GROQ_API_KEY` en `.env` (opcional — Suite 8)

## Criterios de Éxito

- [ ] 5 suites E2E pasan con `pnpm test`
- [ ] Helpers importados por tests, cero duplicación de setup
- [ ] JSDoc en todo método público de helpers
- [ ] Tests con LLM real se saltan si falta API key
- [ ] Suite concurrencia pasa con 5+ agentes simultáneos
- [ ] Suite volumen pasa con 500+ receipts (<30s local)
- [ ] 169 tests existentes siguen pasando
