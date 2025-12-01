/**
 * Model Selection Strategy
 * Görev karmaşıklığına göre GPT model seçimi
 */

export function selectModel(
  agentRole: string,
  taskComplexity: 'simple' | 'medium' | 'complex' | 'critical',
  budget?: 'low' | 'medium' | 'high'
): string {
  const strategies: Record<string, Record<string, string>> = {
    planning: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    warehouse: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4o-mini',
      complexTasks: 'gpt-4-turbo',
      criticalTasks: 'gpt-4o'
    },
    production: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    purchase: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    manager: {
      simpleTasks: 'gpt-4-turbo',
      mediumTasks: 'gpt-4o',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    developer: {
      simpleTasks: 'gpt-4-turbo',
      mediumTasks: 'gpt-4o',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    }
  };
  
  const strategy = strategies[agentRole.toLowerCase()];
  if (!strategy) {
    return process.env.GPT_MODEL_FALLBACK || 'gpt-4o';
  }
  
  // Budget constraint
  if (budget === 'low' && taskComplexity !== 'critical') {
    return process.env.GPT_MODEL_BUDGET || 'gpt-4o-mini';
  }
  
  const taskKey = `${taskComplexity}Tasks` as keyof typeof strategy;
  return strategy[taskKey] || process.env.GPT_MODEL_FALLBACK || 'gpt-4o';
}


