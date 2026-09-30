import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { LedgerService } from "./ledger.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("ledger")
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  /**
   * GET /ledger/:accountNumber — paginated ledger entries for an account
   * Query params: page, limit, from (ISO date), to (ISO date)
   */
  @Get(":accountNumber")
  async getLedgerByAccount(
    @Param("accountNumber") accountNumber: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.ledgerService.getEntriesByAccount(accountNumber.toUpperCase(), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      from,
      to,
    });
  }

  /**
   * GET /ledger/entry/:id — get a single ledger entry by MongoDB ID
   */
  @Get("entry/:id")
  async getEntry(@Param("id") id: string) {
    return this.ledgerService.getEntryById(id);
  }

  /**
   * GET /ledger/transaction/:txnId — get all entries for a transaction
   */
  @Get("transaction/:txnId")
  async getByTransaction(@Param("txnId") txnId: string) {
    return this.ledgerService.getEntriesByTransaction(txnId);
  }
}
