package main

import (
	"fmt"
	"net"
	"time"

	utls "github.com/ulixee/utls"
)

type TrackedConn struct {
	net.Conn

	startTime time.Time
	target    string

	bytesRead    int
	bytesWritten int
}

func asTCPConn(conn net.Conn) (*net.TCPConn, bool) {
	if trackeConn, ok := conn.(*TrackedConn); ok {
		tcpConn, ok := trackeConn.Conn.(*net.TCPConn)
		return tcpConn, ok
	}
	if tcpConn, ok := conn.(*net.TCPConn); ok {
		return tcpConn, true
	}
	return nil, false
}

func extractTrackedStats(conn net.Conn) (*TrackedStats, bool) {
	if trackeConn, ok := conn.(*TrackedConn); ok {
		stats := trackeConn.Stats()
		return &stats, true
	}
	if tlsConn, ok := conn.(*utls.UConn); ok {
		return extractTrackedStats(tlsConn.GetUnderlyingConn())
	}
	return nil, false
}

type TrackedStats struct {
	StartTime time.Time
	Duration  time.Duration
	Target    string

	BytesRead    int
	BytesWritten int
}

func NewTrackedConn(conn net.Conn, target string) *TrackedConn {
	return &TrackedConn{
		Conn: conn,

		startTime: time.Now(),
		target:    target,
	}
}

func (t *TrackedConn) Read(p []byte) (int, error) {
	n, err := t.Conn.Read(p)
	t.bytesRead += n
	if err != nil {
		return n, fmt.Errorf("TrackedConn::Read: %w", err)
	}
	return n, nil
}

func (t *TrackedConn) Write(p []byte) (int, error) {
	n, err := t.Conn.Write(p)
	t.bytesWritten += n
	if err != nil {
		return n, fmt.Errorf("TrackedConn::Write: %w", err)
	}
	return n, nil
}

func (t *TrackedConn) Stats() TrackedStats {
	return TrackedStats{
		StartTime: t.startTime,
		Duration:  time.Since(t.startTime),
		Target:    t.target,

		BytesRead:    t.bytesRead,
		BytesWritten: t.bytesWritten,
	}
}
