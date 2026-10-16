import { writeFileSync } from 'fs';
import { openApiDocument } from './openapi';

/** Export the OpenAPI document (used by CI and client generators). */
writeFileSync('openapi.json', JSON.stringify(openApiDocument, null, 2));
console.log('openapi.json written');
