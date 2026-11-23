// Explicit setup allowlist: no student accounts, messages, decisions or history.
export function testTemplate(initial, current) {
  return structuredClone({
    productId: initial.productId ?? 'earbuds', name: current.name, seed: initial.seed,
    days: Math.max(1, Math.ceil((initial.course?.total || current.plannedEndHour || current.endHour || initial.endHour) / 24)),
    ...(initial.course && { courseSettings: { phases: initial.course.plan, trainingHours: initial.course.trainingHours, benchmark: initial.course.benchmark } }),
    companyNames: current.companies.filter(c => !c.bot).map(c => c.name),
    revenueAt: initial.accounting?.revenueAt || 'receipt',
    dailyCorporateOverhead: initial.accounting?.dailyCorporateOverhead || 0,
    dailyEnergyOverhead: initial.accounting?.dailyEnergyOverhead ?? 0,
    dailyDepreciation: initial.accounting?.dailyDepreciation ?? null,
    startingPrices: initial.accounting?.startingPrices ?? {},
    inventoryStatement: initial.accounting?.inventoryStatement ?? 'cogs',
    openingUnitCosts: initial.accounting?.openingUnitCosts ?? {},
    features: current.features, effects: current.effects, catalog: initial.productId ? current.catalog : undefined,
    recipe: initial.productId ? initial.recipe : undefined, secondsPerHour: current.secondsPerHour
  });
}
