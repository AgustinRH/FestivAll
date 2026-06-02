import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { SitemapService } from './sitemap.service';

@ApiTags('sitemap')
@Controller('sitemap')
export class SitemapController {
  constructor(private sitemapService: SitemapService) {}

  @Get()
  @ApiOperation({ summary: 'Sitemap XML para SEO' })
  @ApiProduces('application/xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  getSitemap(): Promise<string> {
    return this.sitemapService.buildXml();
  }
}
