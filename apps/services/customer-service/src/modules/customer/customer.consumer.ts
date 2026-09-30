import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { KafkaEventBus } from "@banking/kafka";
import { appConfig } from "@banking/config";
import { createLogger } from "@banking/logger";
import {
  KafkaTopics,
  IBankingEvent,
  IUserRegisteredPayload,
  KycStatus,
} from "@banking/shared-types";

@Injectable()
export class CustomerConsumer implements OnModuleInit, OnModuleDestroy {
  private kafkaBus: KafkaEventBus;
  private logger = createLogger("CustomerConsumer");

  constructor(private readonly customerService: CustomerService) {
    this.kafkaBus = new KafkaEventBus({
      clientId: "customer-service",
      brokers: appConfig.kafka.brokers,
      groupId: "customer-service-group",
    });
  }

  async onModuleInit() {
    try {
      await this.kafkaBus.subscribe(
        [KafkaTopics.USER_REGISTERED],
        async ({ topic, message }) => {
          if (!message.value) return;

          try {
            const eventStr = message.value.toString();
            const event: IBankingEvent<IUserRegisteredPayload> =
              JSON.parse(eventStr);

            this.logger.info(
              `Received event ${event.eventType} on topic ${topic}`,
              {
                eventId: event.eventId,
                correlationId: event.correlationId,
              },
            );

            if (event.eventType === "UserRegistered" && event.payload) {
              const { userId, email, firstName, lastName } = event.payload;

              // Idempotent customer creation
              await this.customerService.createCustomer({
                userId,
                email,
                firstName: firstName || "Customer",
                lastName: lastName || "User",
                kycStatus: KycStatus.PENDING,
              });

              this.logger.info(
                `Idempotently processed customer profile for user ${userId}`,
              );
            }
          } catch (err: any) {
            this.logger.error(
              `Error processing Kafka event on topic ${topic}: ${err?.message}`,
            );
          }
        },
      );
    } catch (err: any) {
      this.logger.warn(`Kafka consumer initialization notice: ${err?.message}`);
    }
  }

  async onModuleDestroy() {
    await this.kafkaBus.disconnect();
  }
}
