package main

import (
	"context"
	"net"
	"net/url"
	"time"
)

type Dialer struct {
	net.Dialer
}

func (d *Dialer) Dial(network, addr string) (net.Conn, error) {
	return d.DialContext(context.Background(), network, addr)
}

func (d *Dialer) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	conn, err := d.Dialer.DialContext(ctx, network, addr)
	if err != nil {
		return nil, err
	}
	return NewTrackedConn(conn, addr), nil
}

func Dial(addr string, connectArgs ConnectArgs, sessionArgs SessionArgs) (net.Conn, error) {
	var dialTimeout = time.Duration(15) * time.Second

	/// Dial the server
	dialer := Dialer{
		Dialer: net.Dialer{
			Control: ConfigureSocket(sessionArgs.TcpTtl, sessionArgs.TcpWindowSize),
			Timeout: dialTimeout,
		},
	}

	if connectArgs.ProxyUrl != "" {
		proxyUrl, err := url.Parse(connectArgs.ProxyUrl)
		if err != nil {
			return nil, err
		}

		if proxyUrl.Scheme == "socks5" || proxyUrl.Scheme == "socks5h" {
			return DialAddrViaSock5Proxy(&dialer, addr, proxyUrl)
		}

		return DialAddrViaHttpProxy(&dialer, addr, proxyUrl, !sessionArgs.RejectUnauthorized)
	}

	dialConn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return nil, err
	}

	tcpConn, ok := asTCPConn(dialConn)
	if ok {
		if connectArgs.KeepAlive {
			tcpConn.SetKeepAlive(true)
		}
		tcpConn.SetNoDelay(connectArgs.IsWebsocket)
		tcpConn.SetLinger(0)
	}

	return dialConn, nil
}
