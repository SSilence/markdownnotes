<?php

namespace DirectoryTree\ImapEngine;

use DirectoryTree\ImapEngine\Connection\ImapQueryBuilder;
use DirectoryTree\ImapEngine\Support\ForwardsCalls;
use Illuminate\Support\Traits\Conditionable;

trait QueriesMessages
{
    use Conditionable, ForwardsCalls;

    /**
     * The query builder instance.
     */
    protected ImapQueryBuilder $query;

    /**
     * The current page.
     */
    protected int $page = 1;

    /**
     * The fetch limit.
     */
    protected ?int $limit = null;

    /**
     * Whether to fetch the message body.
     */
    protected bool $fetchBody = false;

    /**
     * Whether to fetch the message flags.
     */
    protected bool $fetchFlags = false;

    /**
     * Whether to fetch the message headers.
     */
    protected bool $fetchHeaders = false;

    /**
     * The fetch order.
     */
    protected string $fetchOrder = 'desc';

    /**
     * Whether to leave messages fetched as unread by default.
     */
    protected bool $fetchAsUnread = true;

    /**
     * The methods that should be returned from query builder.
     */
    protected array $passthru = ['toimap', 'isempty'];

    /**
     * Handle dynamic method calls into the query builder.
     */
    public function __call(string $method, array $parameters): mixed
    {
        if (in_array(strtolower($method), $this->passthru)) {
            return $this->query->{$method}(...$parameters);
        }

        $this->forwardCallTo($this->query, $method, $parameters);

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function leaveUnread(): MessageQueryInterface
    {
        $this->fetchAsUnread = true;

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function markAsRead(): MessageQueryInterface
    {
        $this->fetchAsUnread = false;

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function limit(int $limit, int $page = 1): MessageQueryInterface
    {
        if ($page >= 1) {
            $this->page = $page;
        }

        $this->limit = $limit;

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function getLimit(): ?int
    {
        return $this->limit;
    }

    /**
     * {@inheritDoc}
     */
    public function setLimit(int $limit): MessageQueryInterface
    {
        $this->limit = max($limit, 1);

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function getPage(): int
    {
        return $this->page;
    }

    /**
     * {@inheritDoc}
     */
    public function setPage(int $page): MessageQueryInterface
    {
        $this->page = $page;

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function isFetchingBody(): bool
    {
        return $this->fetchBody;
    }

    /**
     * {@inheritDoc}
     */
    public function isFetchingFlags(): bool
    {
        return $this->fetchFlags;
    }

    /**
     * {@inheritDoc}
     */
    public function isFetchingHeaders(): bool
    {
        return $this->fetchHeaders;
    }

    /**
     * {@inheritDoc}
     */
    public function withFlags(): MessageQueryInterface
    {
        return $this->setFetchFlags(true);
    }

    /**
     * {@inheritDoc}
     */
    public function withBody(): MessageQueryInterface
    {
        return $this->setFetchBody(true);
    }

    /**
     * {@inheritDoc}
     */
    public function withHeaders(): MessageQueryInterface
    {
        return $this->setFetchHeaders(true);
    }

    /**
     * {@inheritDoc}
     */
    public function withoutBody(): MessageQueryInterface
    {
        return $this->setFetchBody(false);
    }

    /**
     * {@inheritDoc}
     */
    public function withoutHeaders(): MessageQueryInterface
    {
        return $this->setFetchHeaders(false);
    }

    /**
     * {@inheritDoc}
     */
    public function withoutFlags(): MessageQueryInterface
    {
        return $this->setFetchFlags(false);
    }

    /**
     * Set whether to fetch the flags.
     */
    protected function setFetchFlags(bool $fetchFlags): MessageQueryInterface
    {
        $this->fetchFlags = $fetchFlags;

        return $this;
    }

    /**
     * Set the fetch body flag.
     */
    protected function setFetchBody(bool $fetchBody): MessageQueryInterface
    {
        $this->fetchBody = $fetchBody;

        return $this;
    }

    /**
     * Set whether to fetch the headers.
     */
    protected function setFetchHeaders(bool $fetchHeaders): MessageQueryInterface
    {
        $this->fetchHeaders = $fetchHeaders;

        return $this;
    }

    /** {@inheritDoc} */
    public function setFetchOrder(string $fetchOrder): MessageQueryInterface
    {
        $fetchOrder = strtolower($fetchOrder);

        if (in_array($fetchOrder, ['asc', 'desc'])) {
            $this->fetchOrder = $fetchOrder;
        }

        return $this;
    }

    /**
     * {@inheritDoc}
     */
    public function getFetchOrder(): string
    {
        return $this->fetchOrder;
    }

    /**
     * {@inheritDoc}
     */
    public function setFetchOrderAsc(): MessageQueryInterface
    {
        return $this->setFetchOrder('asc');
    }

    /**
     * {@inheritDoc}
     */
    public function setFetchOrderDesc(): MessageQueryInterface
    {
        return $this->setFetchOrder('desc');
    }

    /**
     * {@inheritDoc}
     */
    public function oldest(): MessageQueryInterface
    {
        return $this->setFetchOrder('asc');
    }

    /**
     * {@inheritDoc}
     */
    public function newest(): MessageQueryInterface
    {
        return $this->setFetchOrder('desc');
    }
}
