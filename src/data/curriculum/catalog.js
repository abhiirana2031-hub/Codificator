import { cppModule } from './modules/cppModule.js';
import { javaModule } from './modules/javaModule.js';
import { dsaModule } from './modules/dsaModule.js';
import { frontendModule } from './modules/frontendModule.js';
import { backendModule } from './modules/backendModule.js';
import { dbmsModule } from './modules/dbmsModule.js';
import { osModule } from './modules/osModule.js';
import { networksModule } from './modules/networksModule.js';
import { systemDesignModule } from './modules/systemDesignModule.js';
import { gitToolsModule } from './modules/gitToolsModule.js';
import { mlModule } from './modules/mlModule.js';

export const curriculumCatalog = [
  cppModule,
  javaModule,
  dsaModule,
  frontendModule,
  backendModule,
  dbmsModule,
  osModule,
  networksModule,
  systemDesignModule,
  gitToolsModule,
  mlModule
];

export const CURRICULUM_DOMAINS = curriculumCatalog;
