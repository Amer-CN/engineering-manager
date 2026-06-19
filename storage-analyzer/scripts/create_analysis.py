import json
import time

analysis = {
    'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    'scan_seconds': 0,
    'system': {
        'os': 'Windows 11',
        'build': '10.0.28000',
        'arch': 'AMD64',
        'user': 'Admin',
        'home': 'C:\\Users\\Admin',
        'filesystem': 'NTFS',
        'disk_total': '111.6 GB',
        'disk_used': '86.0 GB',
        'disk_free': '25.6 GB',
        'purgeable': '',
        'disk_name': 'C:\\',
        'disks': [
            {'name': 'C:\\', 'total': '111.6 GB', 'used': '86.0 GB', 'free': '25.6 GB'},
            {'name': 'D:\\', 'total': '120.0 GB', 'used': '90.6 GB', 'free': '29.4 GB'},
            {'name': 'E:\\', 'total': '831.5 GB', 'used': '799.6 GB', 'free': '31.9 GB'},
            {'name': 'F:\\', 'total': '100.0 GB', 'used': '52.2 GB', 'free': '47.8 GB'}
        ]
    },
    'top5': [
        {'rank': 1, 'tier': 'yellow', 'size': '约 46.4 GB', 'type': '用户文件', 'name': 'WPSDrive', 'path': 'C:\\Users\\Admin\\WPSDrive', 'note': 'WPS云盘本地缓存'},
        {'rank': 2, 'tier': 'yellow', 'size': '约 39.9 GB', 'type': '应用数据', 'name': 'AppData', 'path': 'C:\\Users\\Admin\\AppData', 'note': '应用程序数据目录'},
        {'rank': 3, 'tier': 'yellow', 'size': '约 4.3 GB', 'type': '用户文件', 'name': 'WPS Cloud Files', 'path': 'C:\\Users\\Admin\\WPS Cloud Files', 'note': 'WPS云文件本地副本'},
        {'rank': 4, 'tier': 'yellow', 'size': '约 3.6 GB', 'type': '应用数据', 'name': '.workbuddy', 'path': 'C:\\Users\\Admin\\.workbuddy', 'note': 'WorkBuddy应用数据'},
        {'rank': 5, 'tier': 'green', 'size': '约 2.7 GB', 'type': '开发缓存', 'name': '.rustup', 'path': 'C:\\Users\\Admin\\.rustup', 'note': 'Rust工具链缓存'}
    ],
    'green': [
        {
            'name': 'Rust工具链缓存',
            'path': 'C:\\Users\\Admin\\.rustup',
            'size_estimate': '约 2.7 GB',
            'kill_processes': [],
            'trash_paths': ['C:\\Users\\Admin\\.rustup'],
            'commands': [{'label': '删除Rust工具链缓存', 'cmd': 'Remove-Item -Recurse -Force "$env:USERPROFILE\\.rustup"'}]
        },
        {
            'name': 'WPS安装包',
            'path': 'C:\\Users\\Admin\\Downloads\\WPS_Setup_X64_25222.exe',
            'size_estimate': '约 307 MB',
            'kill_processes': [],
            'trash_paths': ['C:\\Users\\Admin\\Downloads\\WPS_Setup_X64_25222.exe'],
            'commands': [{'label': '删除WPS安装包', 'cmd': 'Remove-Item -Force "$env:USERPROFILE\\Downloads\\WPS_Setup_X64_25222.exe"'}]
        }
    ],
    'yellow': [
        {
            'name': 'WPSDrive云盘缓存',
            'path': 'C:\\Users\\Admin\\WPSDrive',
            'size': '约 46.4 GB',
            'content_profile': 'WPS云盘本地同步缓存，包含云文档的本地副本',
            'why_manual': '可能包含重要的工作文档，需要确认是否已同步到云端',
            'disposal': '在WPS应用内清理缓存，或手动删除不需要的同步文件夹',
            'risk': '删除后可能需要重新同步云文档',
            'trash_paths': [],
            'open_note': 'WPSDrive是WPS云盘的本地缓存目录，包含云文档的本地副本。建议在WPS应用内管理缓存。'
        },
        {
            'name': 'AppData应用数据',
            'path': 'C:\\Users\\Admin\\AppData',
            'size': '约 39.9 GB',
            'content_profile': '应用程序配置、缓存、临时文件等',
            'why_manual': '包含应用程序的重要配置和数据，不能随意删除',
            'disposal': '使用Windows磁盘清理工具，或手动清理各个应用程序的缓存',
            'risk': '误删可能导致应用程序需要重新配置',
            'trash_paths': [],
            'open_note': 'AppData是Windows应用程序数据目录，包含Local、LocalLow、Roaming三个子目录。建议使用系统工具清理。'
        },
        {
            'name': 'WPS云文件本地副本',
            'path': 'C:\\Users\\Admin\\WPS Cloud Files',
            'size': '约 4.3 GB',
            'content_profile': 'WPS云文件的本地副本',
            'why_manual': '可能包含重要的工作文档',
            'disposal': '在WPS应用内管理云文件，或手动删除不需要的本地副本',
            'risk': '删除后需要重新从云端下载',
            'trash_paths': [],
            'open_note': 'WPS云文件的本地副本，建议在WPS应用内管理。'
        }
    ],
    'red': [],
    'denied': [],
    'summary': {
        'overview': 'C盘空间紧张，主要被WPSDrive云盘缓存（46.4 GB）和AppData应用数据（39.9 GB）占用，建议优先清理云盘缓存和应用临时文件。',
        'tier_stats': {
            'green': '约 3.0 GB',
            'yellow': '约 90.6 GB',
            'red': '约 0 GB'
        },
        'priority': [
            '清理WPSDrive云盘缓存（约46.4 GB）',
            '清理AppData中的临时文件和缓存',
            '删除Downloads中的安装包（约307 MB）'
        ],
        'long_term': [
            '定期清理浏览器缓存和临时文件',
            '使用Windows磁盘清理工具',
            '考虑将大文件移动到其他磁盘',
            '配置WPS云盘的同步策略，减少本地缓存'
        ]
    }
}

with open('analysis.json', 'w', encoding='utf-8') as f:
    json.dump(analysis, f, ensure_ascii=False, indent=2)
print('analysis.json created')
