import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { SubmitKycDto } from '@banking/shared-types';

export class SubmitKycRequestDto implements SubmitKycDto {
  @IsIn(['PASSPORT', 'DRIVING_LICENSE', 'NATIONAL_ID'], {
    message: 'documentType must be PASSPORT, DRIVING_LICENSE, or NATIONAL_ID',
  })
  documentType: 'PASSPORT' | 'DRIVING_LICENSE' | 'NATIONAL_ID';

  @IsString()
  @IsNotEmpty({ message: 'documentNumber is required' })
  documentNumber: string;
}
