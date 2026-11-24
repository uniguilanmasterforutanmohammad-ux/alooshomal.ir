import { Module } from '@nestjs/common';

import { BusinessModulesModule } from '../business-modules/business-modules.module';
import { EduClassesController } from './edu-classes.controller';
import { EduEnrollmentsController } from './edu-enrollments.controller';
import { EduFinanceController } from './edu-finance.controller';
import { EduProgressController } from './edu-progress.controller';
import { EduReportsController } from './edu-reports.controller';
import { EduSessionsController } from './edu-sessions.controller';
import { EduStudentsController } from './edu-students.controller';
import { EduTuitionController } from './edu-tuition.controller';
import { PublicEducationController } from './public-education.controller';
import { EducationService } from './education.service';

@Module({
  imports: [BusinessModulesModule],
  controllers: [
    EduClassesController,
    EduStudentsController,
    EduEnrollmentsController,
    EduSessionsController,
    EduProgressController,
    EduTuitionController,
    EduFinanceController,
    EduReportsController,
    PublicEducationController,
  ],
  providers: [EducationService],
  exports: [EducationService],
})
export class EducationModule {}
