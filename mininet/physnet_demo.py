#!/usr/bin/env python3
"""
PhysNet demo network for Mininet + ONOS.

A small two-floor campus: a core switch in the server room, a distribution
switch per floor joined into a ring with the core (so ONOS can reroute), and
access switches with hosts in the rooms.

                         s1  core, server room
                    1 /  |3 |4  \\ 2           srv1 10.0.0.100 (web, :80)
                     /  srv1 srv2 \\           srv2 10.0.0.101
            floor 1 s2 ----------- s3 floor 3   (s2/2 <-> s3/2: ring link)
                  3 / \\ 4       3 / \\ 4
                  s4   s5         s6   s7
                 /  \\   |         |   /  \\
                h1  h2  h3        h4  h5  h6

Port numbers are fixed (see LINKS) so that policies can name them:
switch port 1 always faces the uplink, hosts sit on ports 2 and 3.

Run on the Mininet machine. With ONOS on the same machine (for example in
Docker with ports 6653 and 8181 published) no options are needed:

    sudo python3 physnet_demo.py

When ONOS runs elsewhere (another host, a VM), pass its address:

    sudo python3 physnet_demo.py --controller <ONOS address>

Extra commands in the Mininet CLI (type `help` for the rest):

    scenario            print the demo scenario
    fwd on|off          switch ONOS reactive forwarding on or off
    discover            make every host known to ONOS again
    intents             list the intents installed in ONOS
"""

import argparse
import base64
import json
import urllib.error
import urllib.request
from functools import partial

from mininet.cli import CLI
from mininet.log import info, output, setLogLevel
from mininet.net import Mininet
from mininet.node import OVSSwitch, RemoteController
from mininet.topo import Topo

SWITCHES = {
    # name: description shown as the device name in ONOS and PhysNet
    's1': 'core, server room',
    's2': 'distribution, floor 1',
    's3': 'distribution, floor 3',
    's4': 'access, room 101',
    's5': 'access, room 105',
    's6': 'access, room 301',
    's7': 'access, room 305',
}

HOSTS = {
    # name: (ip, mac)
    'h1': ('10.0.0.1', '00:00:00:00:00:01'),
    'h2': ('10.0.0.2', '00:00:00:00:00:02'),
    'h3': ('10.0.0.3', '00:00:00:00:00:03'),
    'h4': ('10.0.0.4', '00:00:00:00:00:04'),
    'h5': ('10.0.0.5', '00:00:00:00:00:05'),
    'h6': ('10.0.0.6', '00:00:00:00:00:06'),
    'srv1': ('10.0.0.100', '00:00:00:00:01:00'),
    'srv2': ('10.0.0.101', '00:00:00:00:01:01'),
}

# (node1, port1, node2, port2); host ports are always 0 (eth0)
LINKS = [
    ('s1', 1, 's2', 1),
    ('s1', 2, 's3', 1),
    ('s2', 2, 's3', 2),  # ring: lets ONOS reroute around a failure
    ('s1', 3, 'srv1', 0),
    ('s1', 4, 'srv2', 0),
    ('s2', 3, 's4', 1),
    ('s2', 4, 's5', 1),
    ('s3', 3, 's6', 1),
    ('s3', 4, 's7', 1),
    ('s4', 2, 'h1', 0),
    ('s4', 3, 'h2', 0),
    ('s5', 2, 'h3', 0),
    ('s6', 2, 'h4', 0),
    ('s7', 2, 'h5', 0),
    ('s7', 3, 'h6', 0),
]

FWD_APP = 'org.onosproject.fwd'
PROXYARP_APP = 'org.onosproject.proxyarp'

SCENARIO = """
Сценарій демонстрації PhysNet
=============================

0. Підготовка (вебінтерфейс PhysNet)
   - "Поверх 1": s1, srv1, srv2 (серверна), s2, s3 (стояк), s4, s5, h1-h3.
   - "Поверх 3": ще раз s3 (той самий пристрій може бути на кількох
     планах), s6, s7, h4-h6.
   - Хости PhysNet називає за IP-адресами (h1 = 10.0.0.1 ... srv1 =
     10.0.0.100); за бажанням перейменуйте їх.
   - Кабелі, які бачить ONOS, з'являються самі. Вигніть кілька з них
     уздовж коридорів, магістраль s1 <-> s2 позначте як оптичну.

1. Моніторинг: аварія і відновлення лінії
   mininet> link s2 s3 down        кабель кільця червоніє, у стрічці подій
                                   "Лінія s2/2 ↔ s3/2 розірвана"
   mininet> link s2 s3 up          знову зелений

2. Відмова пристрою
   mininet> switch s7 stop         s7 і його кабелі стають недоступними
   mininet> switch s7 start

3. Керування портом з інтерфейсу (ADMIN)
   mininet> h3 ping 10.0.0.100     нехай працює
   UI: s5 -> порт 2 -> вимкнути    пінг зупиняється, h3 недоступний
   UI: s5 -> порт 2 -> увімкнути, далі  mininet> discover

4. Політики маршрутизації. Спершу вимкніть типову пересилку "усі з усіма",
   щоб проходив лише трафік, дозволений політиками:
   mininet> fwd off
   mininet> h1 ping -c3 h4         100% втрат: політики ще немає

   а) Хост ↔ хост
      UI: політика "h1 ↔ h4", тип "Хост ↔ хост",
          хости 10.0.0.1 (h1) і 10.0.0.4 (h4) -> Застосувати
      mininet> h1 ping -c3 h4      відповіді є; стан "Встановлено"
      mininet> h2 ping -c3 h4      втрати: h2 політика не стосується
      mininet> intents             intent і його стан в ONOS

   б) Intent переживає аварію: ONOS сам прокладає новий шлях
      mininet> h1 ping -i 0.2 h4   нехай працює (шлях s4-s2-s3-s6)
      mininet> link s2 s3 down     кілька відповідей губиться, далі шлях
                                   іде через s1 і пінг відновлюється
      mininet> link s2 s3 up       intent лишається на шляху через s1:
                                   ONOS не перебудовує робочий шлях

   в) Порт → порт із фільтром трафіку: h3 може лише відкрити вебсайт
      srv1 (HTTP, TCP-порт 80), і нічого більше
      UI: "h3 -> вебсервер", тип "Порт → порт", вхід s5/2, вихід s1/3,
          IP призначення 10.0.0.100, протокол TCP, порт 80   -> Застосувати
      UI: "вебсервер -> h3", тип "Порт → порт", вхід s1/3, вихід s5/2,
          IP джерела 10.0.0.100, IP призначення 10.0.0.3, TCP -> Застосувати
      mininet> h3 curl -s -m 3 10.0.0.100 | head -3   сторінка відкривається
      mininet> h3 ping -c3 10.0.0.100                  100% втрат: ICMP
                                                        не дозволено

   г) Відкличте "h1 ↔ h4" в інтерфейсі -> h1 ping h4 знову не працює.

5. Повернення до звичайного режиму
   mininet> fwd on
   mininet> pingall
"""


class CampusTopo(Topo):
    """The topology drawn in the module docstring."""

    def build(self):
        for index, name in enumerate(SWITCHES, start=1):
            self.addSwitch(name, dpid=f'{index:016x}')
        for name, (ip, mac) in HOSTS.items():
            self.addHost(name, ip=f'{ip}/24', mac=mac)
        for node1, port1, node2, port2 in LINKS:
            ports = {'port1': port1}
            if port2:
                ports['port2'] = port2
            self.addLink(node1, node2, **ports)


class Onos:
    """Minimal client of the ONOS REST API."""

    def __init__(self, url, user, password):
        self.url = url.rstrip('/')
        token = base64.b64encode(f'{user}:{password}'.encode()).decode()
        self.auth = f'Basic {token}'

    def request(self, method, path):
        # No body and no Content-Type: some ONOS endpoints reject any.
        req = urllib.request.Request(self.url + path, method=method)
        req.add_header('Authorization', self.auth)
        req.add_header('Accept', 'application/json')
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read()
        return json.loads(body) if body else None

    def set_app(self, name, active):
        self.request('POST' if active else 'DELETE',
                     f'/applications/{name}/active')

    def app_active(self, name):
        try:
            return self.request('GET', f'/applications/{name}')['state'] == 'ACTIVE'
        except urllib.error.HTTPError:
            return False


def disable_ipv6(node):
    """Keeps IPv6 link-local addresses and ND noise out of ONOS."""
    for key in ('all', 'default', 'lo'):
        node.cmd(f'sysctl -qw net.ipv6.conf.{key}.disable_ipv6=1')
    for intf in node.intfNames():
        node.cmd(f'sysctl -qw net.ipv6.conf.{intf}.disable_ipv6=1')


def discover(net):
    """
    Each host sends one ARP request; ONOS learns hosts from such packets
    even when reactive forwarding is off.
    """
    gateway = HOSTS['srv1'][0]
    for host in net.hosts:
        target = gateway if host.name != 'srv1' else HOSTS['h1'][0]
        # A cached neighbour would mean no ARP request at all.
        host.cmd('ip neigh flush all')
        host.cmd(f'ping -c1 -W1 {target} >/dev/null 2>&1')


class DemoCLI(CLI):
    """Mininet CLI with commands for the demo."""

    prompt = 'mininet> '

    def __init__(self, net, onos, **kwargs):
        self.onos = onos
        super().__init__(net, **kwargs)

    def do_scenario(self, _line):
        """Показати сценарій демонстрації."""
        output(SCENARIO)

    def do_fwd(self, line):
        """fwd on|off: реактивна пересилка ONOS (усі хости бачать одне
        одного). off = проходить лише трафік, дозволений політиками."""
        arg = line.strip()
        try:
            if arg == 'off':
                # Proxy ARP keeps address resolution working without fwd.
                self.onos.set_app(PROXYARP_APP, True)
                self.onos.set_app(FWD_APP, False)
                output('Пересилку вимкнено: трафік проходить лише за політиками\n')
            elif arg == 'on':
                self.onos.set_app(FWD_APP, True)
                output('Пересилку увімкнено: усі хости бачать одне одного\n')
            else:
                state = 'увімкнена' if self.onos.app_active(FWD_APP) else 'вимкнена'
                output(f'Пересилка {state}; використання: fwd on|off\n')
        except (urllib.error.URLError, OSError) as error:
            output(f'Запит до ONOS не вдався: {error}\n')

    def do_discover(self, _line):
        """Нагадати ONOS про всі хости (кожен надсилає один ARP)."""
        discover(self.mn)
        output('Кожен хост надіслав ARP-запит\n')

    def do_intents(self, _line):
        """Intents в ONOS та їхній стан."""
        try:
            intents = self.onos.request('GET', '/intents')['intents']
        except (urllib.error.URLError, OSError) as error:
            output(f'Запит до ONOS не вдався: {error}\n')
            return
        if not intents:
            output('Intents немає\n')
        for intent in intents:
            output(f"{intent['state']:<12} {intent['type']:<20} "
                   f"{intent['key']}  ({intent['appId']})\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--controller', default='127.0.0.1',
                        help='ONOS address (default: %(default)s)')
    parser.add_argument('--of-port', type=int, default=6653,
                        help='OpenFlow port (default: %(default)s)')
    parser.add_argument('--onos-url',
                        help='ONOS REST API (default: http://<controller>:8181/onos/v1)')
    parser.add_argument('--onos-user', default='onos')
    parser.add_argument('--onos-password', default='rocks')
    args = parser.parse_args()

    onos = Onos(args.onos_url or f'http://{args.controller}:8181/onos/v1',
                args.onos_user, args.onos_password)

    setLogLevel('info')
    net = Mininet(
        topo=CampusTopo(),
        switch=partial(OVSSwitch, protocols='OpenFlow13'),
        controller=None,
        autoSetMacs=False,
    )
    net.addController('onos', controller=RemoteController,
                      ip=args.controller, port=args.of_port)
    net.start()
    try:
        if not net.waitConnected(timeout=20):
            info(f'*** Not every switch connected to {args.controller}:'
                 f'{args.of_port} yet\n')
        for name, description in SWITCHES.items():
            info(f'*** {name}: {description}\n')
        for host in net.hosts:
            disable_ipv6(host)

        info('*** Starting the web server on srv1 (port 80)\n')
        net.get('srv1').cmd(
            'python3 -m http.server 80 --directory /tmp >/tmp/srv1-http.log 2>&1 &')

        try:
            if not onos.app_active(FWD_APP):
                info('*** Turning ONOS reactive forwarding on\n')
                onos.set_app(FWD_APP, True)
        except (urllib.error.URLError, OSError) as error:
            info(f'*** ONOS REST API unreachable ({error}); '
                 'fwd/intents commands will not work\n')

        info('*** Letting ONOS learn the hosts\n')
        discover(net)
        net.pingAll(timeout=1)
        info('*** Готово. Команда `scenario` показує кроки демонстрації.\n')
        DemoCLI(net, onos)
    finally:
        net.stop()


if __name__ == '__main__':
    main()
