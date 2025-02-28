from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Manage file operations like creating thumbnails'

    def add_arguments(self, parser):
        # Add subcommands like "thumbs"
        parser.add_argument('action', type=str, help="The action to perform (e.g., 'thumbs')")

    def handle(self, *args, **options):
        action = options['action']

        if action == 'thumbs':
            self.generate_thumbnails()
        else:
            raise CommandError(f"Unknown action: {action}")

    def generate_thumbnails(self):
        """
        Your logic to generate thumbnails goes here.
        """
        from filehub.models import MediaFile

        self.stdout.write("Generating thumbnails...")
        files = MediaFile.objects.filter(file_type__in=['image', 'images'])
        for file in files:
            file.update_image_attributes()

