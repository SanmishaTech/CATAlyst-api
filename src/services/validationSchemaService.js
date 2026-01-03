const buildEffectiveLevel2Schema = (defaults, clientSchema) => {
  const defaultsObj = defaults && typeof defaults === "object" ? defaults : {};
  const clientObj = clientSchema && typeof clientSchema === "object" ? clientSchema : {};
  const effective = {};

  for (const [field, defaultVal] of Object.entries(defaultsObj)) {
    const clientVal = clientObj[field];
    if (defaultVal && typeof defaultVal === "object") {
      effective[field] = {
        ...defaultVal,
        ...(clientVal && typeof clientVal === "object" ? clientVal : {}),
      };
      // Preserve default condition if client didn't supply one.
      // (Fixes stale configs where DB only stores enabled toggles but not updated condition strings.)
      const clientCondition =
        clientVal && typeof clientVal === "object" ? clientVal.condition : undefined;
      if (
        defaultVal.condition &&
        (!clientVal ||
          typeof clientVal !== "object" ||
          clientCondition === undefined ||
          clientCondition === null ||
          String(clientCondition).trim() === "" ||
          String(clientCondition).trim() === "-")
      ) {
        effective[field].condition = defaultVal.condition;
      }
    } else {
      effective[field] = clientVal !== undefined ? clientVal : defaultVal;
    }
  }

  for (const [field, val] of Object.entries(clientObj)) {
    if (effective[field] !== undefined) continue;
    effective[field] = val;
  }

  return effective;
};

const buildEffectiveLevelSchemaPreferDefaultConditions = (defaults, clientSchema) => {
  const effective = buildEffectiveLevel2Schema(defaults, clientSchema);
  const defaultsObj = defaults && typeof defaults === "object" ? defaults : {};
  for (const [field, defaultVal] of Object.entries(defaultsObj)) {
    if (!defaultVal || typeof defaultVal !== "object") continue;
    if (!defaultVal.condition) continue;
    if (effective[field] && typeof effective[field] === "object") {
      effective[field].condition = defaultVal.condition;
    }
  }
  return effective;
};

module.exports = {
  buildEffectiveLevel2Schema,
  buildEffectiveLevelSchemaPreferDefaultConditions,
};
