function canAccessProduct(user, product) {
  if (!user) return false;
  if (user.isAdmin) return true;
  const groupIds = user.groupIds || [];
  if (groupIds.length === 0) return true;
  if (product.groupId == null) return true;
  return groupIds.includes(product.groupId);
}

module.exports = { canAccessProduct };
