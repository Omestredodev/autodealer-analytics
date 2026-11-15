// Vistorias documentais de veículos; não modifica audit_events.
const inspectionsName = 'vehicle_inspections';
if (!db.getCollectionNames().includes(inspectionsName)) {
  db.createCollection(inspectionsName, {
    validator: { $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'vehicleId', 'checklist', 'notes', 'status', 'createdAt', 'updatedAt'],
      properties: {
        id: { bsonType: 'string' }, vehicleId: { bsonType: 'string' },
        notes: { bsonType: 'string' },
        status: { enum: ['DRAFT', 'APPROVED'] },
        createdAt: { bsonType: 'date' }, updatedAt: { bsonType: 'date' },
        checklist: {
          bsonType: 'object', required: ['bodywork', 'mechanical', 'tires', 'documents'],
          properties: Object.fromEntries(['bodywork','mechanical','tires','documents'].map(k => [k, { enum: ['OK','ATTENTION','REPAIR'] }])),
        },
      },
    } }, validationAction: 'error',
  });
}
db.getCollection(inspectionsName).createIndex({ id: 1 }, { unique: true, name: 'idx_inspections_id' });
db.getCollection(inspectionsName).createIndex({ vehicleId: 1, createdAt: -1 }, { name: 'idx_inspections_vehicle_created' });
db.getCollection(inspectionsName).createIndex({ createdAt: -1, id: -1 }, { name: 'idx_inspections_recent' });
db.getCollection(inspectionsName).createIndex({ status: 1, createdAt: -1, id: -1 }, { name: 'idx_inspections_status_recent' });
print('[OK] vehicle_inspections preparada; indices de histórico atualizados; audit_events preservada.');
