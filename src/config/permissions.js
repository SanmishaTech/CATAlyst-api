module.exports = {
  // Hierarchical permissions: Admin > Client > User
  
  // Client management (Admin only)
  "clients.read": ["admin"],
  "clients.write": ["admin"],
  "clients.delete": ["admin"],
  
  // User management (Admin and Client)
  "users.read": ["admin", "client"],
  "users.write": ["admin", "client"],
  "users.delete": ["admin", "client"],
  "users.export": ["admin", "client"],
  "members.export": ["admin", "client", "user"],
  "transactions.export": ["admin", "client", "user"],
 
  //packages
  "packages.read": ["admin"],
  "packages.write": ["admin"],
  "packages.delete": ["admin"],
  "subscriptions.write": ["admin"],
  //zones
  "zones.read": ["admin", "client"],
  "zones.write": ["admin"],
  "zones.delete": ["admin"],
  //trainings
  "trainings.read": ["admin", "client"],
  "trainings.write": ["admin", "client"],
  "trainings.update": ["admin", "client"],
  "trainings.delete": ["admin"],
  //categories
  "categories.read": ["admin", "client"],
  "categories.write": ["admin", "client"],
  "categories.update": ["admin", "client"],
  "categories.delete": ["admin"],
  //messages
  "messages.read": ["admin", "client", "user"],
  "messages.write": ["admin", "client", "user"],
  "messages.update": ["admin", "client", "user"],
  "messages.delete": ["admin", "client", "user"],
  // requirements
  "requirements.read": ["admin", "client", "user"],
  "requirements.write": ["admin", "client", "user"],
  "requirements.delete": ["admin", "client", "user"],
  // one-to-ones
  "onetoones.read": ["admin", "client", "user"],
  "onetoones.write": ["admin", "client", "user"],
  "onetoones.delete": ["admin", "client", "user"],
 
   
 
 
  //roles
  "roles.read": ["admin"],
 
};
