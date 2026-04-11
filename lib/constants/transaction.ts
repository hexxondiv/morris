export const paymentStatusColorMap = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export const paymentTypeColorMap = {
  pledge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  donation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  deployment: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  refund: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const paymentTypeLabelMap = {
  pledge: "Pledge",
  donation: "Donation",
  deployment: "Deployment",
  expense: "Expense",
  refund: "Refund",
};