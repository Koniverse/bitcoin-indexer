import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { FastifyPluginCallback } from 'fastify';
import { Server } from 'http';
import {
  AddressSchema,
  LimitSchema,
  OffsetSchema,
  BalanceResponseSchema,
  ActivityResponseSchema,
  RuneUTXOResponseSchema,
} from '../schemas';
import { parseActivityResponse, parseBalanceResponse, parseRuneUTXOResponse } from '../util/helpers';
import { Optional, PaginatedResponse } from '@hirosystems/api-toolkit';
import { handleCache } from '../util/cache';

export const AddressRoutes: FastifyPluginCallback<
  Record<never, never>,
  Server,
  TypeBoxTypeProvider
> = (fastify, options, done) => {
  fastify.addHook('preHandler', handleCache);

  fastify.get(
    '/addresses/:address/balances',
    {
      schema: {
        operationId: 'getAddressBalances',
        summary: 'Address balances',
        description: 'Retrieves a paginated list of address balances',
        tags: ['Balances'],
        params: Type.Object({
          address: AddressSchema,
        }),
        querystring: Type.Object({
          offset: Optional(OffsetSchema),
          limit: Optional(LimitSchema),
        }),
        response: {
          200: PaginatedResponse(BalanceResponseSchema, 'Paginated balances response'),
        },
      },
    },
    async (request, reply) => {
      const offset = request.query.offset ?? 0;
      const limit = request.query.limit ?? 20;
      const results = await fastify.db.getAddressBalances(request.params.address, offset, limit);
      await reply.send({
        limit,
        offset,
        total: results?.total ?? 0,
        results: results.results.map(r => parseBalanceResponse(r)),
      });
    }
  );

  fastify.get(
    '/addresses/:address/activity',
    {
      schema: {
        operationId: 'getAddressActivity',
        summary: 'Address activity',
        description: 'Retrieves a paginated list of rune activity for an address',
        tags: ['Activity'],
        params: Type.Object({
          address: AddressSchema,
        }),
        querystring: Type.Object({
          offset: Optional(OffsetSchema),
          limit: Optional(LimitSchema),
        }),
        response: {
          200: PaginatedResponse(ActivityResponseSchema, 'Paginated activity response'),
        },
      },
    },
    async (request, reply) => {
      const offset = request.query.offset ?? 0;
      const limit = request.query.limit ?? 20;
      const results = await fastify.db.getAddressActivity(request.params.address, offset, limit);
      await reply.send({
        limit,
        offset,
        total: results.total,
        results: results.results.map(r => parseActivityResponse(r)),
      });
    }
  );

  fastify.get(
    '/addresses/:address/utxo',
    {
      schema: {
        operationId: 'getAddressRuneUtxo',
        summary: 'Address Rune UTXO',
        description: 'Retrieves a paginated list of Rune utxo for an address',
        tags: ['Balances'],
        params: Type.Object({
          address: AddressSchema,
        }),
        querystring: Type.Object({
        }),
        response: {
          200: PaginatedResponse(RuneUTXOResponseSchema, 'Paginated balances response'),
        },
      },
    },
    async (request, reply) => {
      const results = await fastify.db.getAddressRuneUtxo(request.params.address);
      await reply.send({
        limit: results.results.length | 0,
        offset: 0,
        total: results.total,
        results: results.results.map(r => parseRuneUTXOResponse(r)),
      });
    }
  );
  done();
};
