import paramiko
import os
import sys

HOST = '147.79.66.116'
PORT = 22
USER = 'root'
PASSWORD = 'Newjoker2k333'
LOCAL_DIR = os.path.join(os.getcwd(), 'sender-pro-api')
REMOTE_DIR = '/var/www/html/sender-pro-api'

def upload_directory(sftp, local_dir, remote_dir):
    """Recursively upload a directory via SFTP."""
    try:
        sftp.mkdir(remote_dir)
    except IOError:
        pass  # Directory may already exist
    
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        
        if os.path.isfile(local_path):
            print(f'Uploading: {local_path} -> {remote_path}')
            sftp.put(local_path, remote_path)
        elif os.path.isdir(local_path):
            upload_directory(sftp, local_path, remote_path)

def main():
    if not os.path.isdir(LOCAL_DIR):
        print(f'Local directory not found: {LOCAL_DIR}')
        sys.exit(1)

    print(f'Connecting to {HOST}:{PORT} as {USER}...')
    
    transport = paramiko.Transport((HOST, PORT))
    transport.connect(username=USER, password=PASSWORD)
    
    sftp = paramiko.SFTPClient.from_transport(transport)
    
    # Ensure remote directory exists
    try:
        sftp.mkdir(REMOTE_DIR)
        print(f'Created remote directory: {REMOTE_DIR}')
    except IOError:
        print(f'Remote directory already exists: {REMOTE_DIR}')
    
    # Upload files
    print('Starting upload...')
    upload_directory(sftp, LOCAL_DIR, REMOTE_DIR)
    
    sftp.close()
    transport.close()
    
    print('Upload completed successfully!')

if __name__ == '__main__':
    main()
