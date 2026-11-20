import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class GenerateCbtDto {
  @IsUUID()
  classRoomId: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  termId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  topicsCovered: string;

  @IsInt()
  @Min(5)
  @Max(30)
  @IsOptional()
  questionCount?: number;

  @IsInt()
  @Min(5)
  @Max(90)
  @IsOptional()
  durationMinutes?: number;
}

export class SubmitCbtDto {
  @IsArray()
  @IsInt({ each: true })
  answers: number[];
}
