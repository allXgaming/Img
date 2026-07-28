function calculateProjectScore(complexity, length) {
  let baseScore = 50;
  if (complexity === 'high') baseScore += 30;
  if (length > 10) baseScore += 20;
  return baseScore;
}

function filterPortfolioByCategory(items, category) {
  if (!category) return items;
  return items.filter(item => item.category === category);
}

function validateAuthData(email, password) {
  if (!email || !email.includes('@')) return { valid: false, message: 'Invalid email address.' };
  if (!password || password.length < 6) return { valid: false, message: 'Password must be at least 6 characters.' };
  return { valid: true };
}

module.exports = {
  calculateProjectScore,
  filterPortfolioByCategory,
  validateAuthData
};