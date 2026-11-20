import 'multer';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Delete,
  Param,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateStaffDto, EnrollStudentDto, UpdateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.TEACHER)
  @Get()
  listUsers(@CurrentUser() user: JwtUserPayload, @Query('role') role?: Role) {
    return this.usersService.listUsers(user.tenantId, role, user.sub, user.role);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('staff')
  createStaff(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('students')
  enrollStudent(@CurrentUser() user: JwtUserPayload, @Body() dto: EnrollStudentDto) {
    return this.usersService.enrollStudent(user.tenantId, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Post('students/bulk-csv')
  @UseInterceptors(FileInterceptor('file'))
  bulkUploadStudents(
    @CurrentUser() user: JwtUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Please upload a CSV file under the field name "file"');
    }
    return this.usersService.bulkEnrollStudentsFromCsv(user.tenantId, file.buffer);
  }

    @Roles(Role.PARENT, Role.STUDENT)
  @Get('my-portal')
  getMyPortal(@CurrentUser() user: JwtUserPayload) {
    return this.usersService.getMyPortal(user.tenantId, user.sub, user.role);
  }


    @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Patch(':id')
  updateUser(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(user.tenantId, id, dto);
  }

  @Roles(Role.SCHOOL_OWNER, Role.ADMIN)
  @Delete(':id')
  deleteUser(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.usersService.deleteUser(user.tenantId, id, user.sub);
  }

}
