#!/usr/bin/env python3
from crawler_service import CrawlerService

if __name__ == "__main__":
    try:
        service = CrawlerService(max_depth=1)
        service.run()
    except KeyboardInterrupt:
        print("Service stopped by user")
    finally:
        if 'service' in locals():
            service.close()
