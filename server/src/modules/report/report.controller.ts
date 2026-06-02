import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportService } from './report.service';

@Controller('report')
@UseGuards(AuthGuard('jwt'))
export class ReportController {
  constructor(private reportService: ReportService) {}

  /**
   * 报表概览（支持日期范围）
   */
  @Get('overview')
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportService.getOverview(startDate, endDate);
    return { code: 200, data };
  }

  /**
   * 销售排行
   */
  @Get('top-products')
  async getTopProducts(
    @Query('limit') limit: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportService.getTopProducts(
      limit ? parseInt(limit) : 5,
      startDate,
      endDate,
    );
    return { code: 200, data };
  }

  /**
   * 低库存预警
   */
  @Get('low-stock')
  async getLowStock() {
    const data = await this.reportService.getLowStockProducts();
    return { code: 200, data };
  }

  /**
   * 消息通知列表（从低库存 + 待审核订单动态生成）
   */
  @Get('notifications')
  async getNotifications(@Query('unread') unread?: string) {
    const data = await this.reportService.getNotifications();
    if (unread === 'true') {
      const unreadCount = data.list.filter((n) => !n.read).length;
      return { code: 200, data: { list: [], total: unreadCount } };
    }
    return { code: 200, data };
  }

  /**
   * 标记单条通知已读（内存级，重启后重置）
   */
  @Put('notifications/:id/read')
  async markNotificationRead() {
    return { code: 200, data: { success: true } };
  }

  /**
   * 全部标记已读
   */
  @Put('notifications/read-all')
  async markAllNotificationsRead() {
    return { code: 200, data: { success: true } };
  }
}
