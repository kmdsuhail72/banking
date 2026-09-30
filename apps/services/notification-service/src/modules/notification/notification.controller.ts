import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications — list paginated notifications
   * ?unread=true — only unread
   * ?page=1&limit=20
   */
  @Get()
  async getNotifications(
    @CurrentUser("sub") userId: string,
    @Query("unread") unread?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!userId)
      throw new BadRequestException("User ID could not be identified");
    return this.notificationService.getNotifications(userId, {
      unreadOnly: unread === "true",
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * PATCH /notifications/:id/read — mark single notification as read
   */
  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser("sub") userId: string,
  ) {
    if (!userId)
      throw new BadRequestException("User ID could not be identified");
    return this.notificationService.markAsRead(id, userId);
  }

  /**
   * PATCH /notifications/read-all — mark all notifications as read
   */
  @Patch("read-all")
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser("sub") userId: string) {
    if (!userId)
      throw new BadRequestException("User ID could not be identified");
    return this.notificationService.markAllAsRead(userId);
  }

  /**
   * DELETE /notifications/:id — delete a notification
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param("id") id: string,
    @CurrentUser("sub") userId: string,
  ) {
    if (!userId)
      throw new BadRequestException("User ID could not be identified");
    return this.notificationService.deleteNotification(id, userId);
  }
}
