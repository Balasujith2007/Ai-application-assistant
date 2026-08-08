import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService, ChatMessage } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsArray, IsString, IsIn } from 'class-validator';

class ChatDto {
  @IsArray()
  messages: ChatMessage[];
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto.messages);
  }
}
