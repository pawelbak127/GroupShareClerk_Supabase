// Przykładowy test architektury weryfikujący warstwy i zależności
// src/tests/architecture/layers.test.ts

import { expect } from 'vitest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as depcheck from 'dependency-cruiser';

describe('Clean Architecture Rules', () => {
  // Ścieżki do warstw
  const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../');
  const DOMAIN_DIR = join(SRC_DIR, 'domain');
  const APPLICATION_DIR = join(SRC_DIR, 'application');
  const INFRASTRUCTURE_DIR = join(SRC_DIR, 'infrastructure');
  const INTERFACE_DIR = join(SRC_DIR, 'interface');

  test('Domain nie powinien zależeć od żadnej innej warstwy', async () => {
    const result = await depcheck.cruise([DOMAIN_DIR], {
      exclude: '(node_modules|dist|.next)',
    });

    const domainModules = result.modules.filter(m => m.source.startsWith(DOMAIN_DIR));
    const invalidDependencies = domainModules.flatMap(m => 
      m.dependencies.filter(d => 
        d.resolved.startsWith(APPLICATION_DIR) || 
        d.resolved.startsWith(INFRASTRUCTURE_DIR) ||
        d.resolved.startsWith(INTERFACE_DIR)
      )
    );

    expect(invalidDependencies).toHaveLength(0);
  });

  test('Application może zależeć tylko od Domain', async () => {
    const result = await depcheck.cruise([APPLICATION_DIR], {
      exclude: '(node_modules|dist|.next)',
    });

    const applicationModules = result.modules.filter(m => m.source.startsWith(APPLICATION_DIR));
    const invalidDependencies = applicationModules.flatMap(m => 
      m.dependencies.filter(d => 
        d.resolved.startsWith(INFRASTRUCTURE_DIR) ||
        d.resolved.startsWith(INTERFACE_DIR)
      )
    );

    expect(invalidDependencies).toHaveLength(0);
  });

  test('Infrastructure może zależeć tylko od Domain i Application', async () => {
    const result = await depcheck.cruise([INFRASTRUCTURE_DIR], {
      exclude: '(node_modules|dist|.next)',
    });

    const infrastructureModules = result.modules.filter(m => m.source.startsWith(INFRASTRUCTURE_DIR));
    const invalidDependencies = infrastructureModules.flatMap(m => 
      m.dependencies.filter(d => 
        d.resolved.startsWith(INTERFACE_DIR)
      )
    );

    expect(invalidDependencies).toHaveLength(0);
  });

  test('Bounded contexts nie powinny zależeć od siebie bezpośrednio', async () => {
    const boundedContexts = ['user', 'group', 'subscription', 'purchase', 'access', 'payment'];
    
    // Pobieramy wszystkie ścieżki do kontekstów ograniczonych w warstwie domeny
    const contextPaths = boundedContexts.map(context => join(DOMAIN_DIR, context));
    
    const result = await depcheck.cruise(contextPaths, {
      exclude: '(node_modules|dist|.next)',
    });

    const invalidDependencies = [];
    
    // Sprawdzamy czy konteksty nie zależą od siebie nawzajem
    // Dozwolone są tylko zależności od shared
    for (const context of boundedContexts) {
      const contextModules = result.modules.filter(m => 
        m.source.includes(`/domain/${context}/`) && 
        !m.source.includes('/domain/shared/')
      );
      
      for (const module of contextModules) {
        for (const dependency of module.dependencies) {
          // Sprawdzamy, czy zależność wskazuje na inny kontekst (ale nie na shared)
          for (const otherContext of boundedContexts) {
            if (context !== otherContext && 
                dependency.resolved.includes(`/domain/${otherContext}/`) &&
                !dependency.resolved.includes('/domain/shared/')) {
              invalidDependencies.push({
                from: module.source,
                to: dependency.resolved
              });
            }
          }
        }
      }
    }

    expect(invalidDependencies).toHaveLength(0);
  });
});