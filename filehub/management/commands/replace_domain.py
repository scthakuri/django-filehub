import json
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db.models import Q
from filehub.fields import FilePickerField, GalleryPickerField, ImagePickerField

class Command(BaseCommand):
    help = 'Replace domain names in FilePickerField, GalleryPickerField, and ImagePickerField across all models.'

    def add_arguments(self, parser):
        parser.add_argument('old_domain', type=str, help='The old domain to replace (e.g. old.com)')
        parser.add_argument('new_domain', type=str, help='The new domain to replace with (e.g. new.com)')
        parser.add_argument('--dry-run', action='store_true', help='Simulate execution without saving changes.')
        parser.add_argument('--no-input', action='store_true', help='Skip confirmation prompt.')

    def handle(self, *args, **options):
        old_domain = options['old_domain']
        new_domain = options['new_domain']
        dry_run = options['dry_run']
        no_input = options['no_input']

        if not no_input:
            self.stdout.write(self.style.WARNING(f"You are about to replace '{old_domain}' with '{new_domain}' in all FilePicker/GalleryPicker/ImagePicker fields."))
            if dry_run:
                self.stdout.write(self.style.NOTICE("Running in DRY RUN mode. No changes will be saved."))
            
            confirm = input("Are you sure you want to proceed? [y/N]: ")
            if confirm.lower() != 'y':
                self.stdout.write(self.style.ERROR("Operation cancelled."))
                return

        self.stdout.write(f"Scanning models for fields containing '{old_domain}'...")
        
        try:
            models = apps.get_models()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error getting models: {e}"))
            return

        total_replacements = 0
        models_checked = 0
        
        for model in models:
            file_picker_fields = []
            gallery_picker_fields = []
            image_picker_fields = []

            for f in model._meta.fields:
                if isinstance(f, FilePickerField):
                    file_picker_fields.append(f.name)
                elif isinstance(f, GalleryPickerField):
                    gallery_picker_fields.append(f.name)
                elif isinstance(f, ImagePickerField):
                    image_picker_fields.append(f.name)
            
            if not (file_picker_fields or gallery_picker_fields or image_picker_fields):
                continue
            
            models_checked += 1
            
            q_obj = Q()
            for f in image_picker_fields:
                q_obj |= Q(**{f"{f}__icontains": old_domain})
            
            qs = model.objects.all()
            if not qs.exists():
                continue

            self.stdout.write(f"Checking model: {model._meta.label} ({qs.count()} objects)")
            
            updates = []
            BATCH_SIZE = 1000
            
            for obj in qs.iterator():
                modified = False
                
                for field_name in file_picker_fields:
                    data = getattr(obj, field_name)
                    if data and isinstance(data, dict):
                        original_json = json.dumps(data, sort_keys=True)
                        if 'url' in data and data['url'] and isinstance(data['url'], str) and old_domain in data['url']:
                            data['url'] = data['url'].replace(old_domain, new_domain)
                        
                        if json.dumps(data, sort_keys=True) != original_json:
                            setattr(obj, field_name, data)
                            modified = True

                for field_name in gallery_picker_fields:
                    data = getattr(obj, field_name)
                    if data and isinstance(data, list):
                        original_json = json.dumps(data, sort_keys=True)
                        new_list = []
                        list_modified = False
                        for item in data:
                            if isinstance(item, dict) and 'url' in item and item['url'] and isinstance(item['url'], str) and old_domain in item['url']:
                                item['url'] = item['url'].replace(old_domain, new_domain)
                                list_modified = True
                            new_list.append(item)
                        
                        if list_modified:
                            setattr(obj, field_name, new_list)
                            modified = True
                            
                for field_name in image_picker_fields:
                    data = getattr(obj, field_name)
                    if data and isinstance(data, str) and old_domain in data:
                        new_data = data.replace(old_domain, new_domain)
                        setattr(obj, field_name, new_data)
                        modified = True

                if modified:
                    total_replacements += 1
                    updates.append(obj)
                    if len(updates) >= BATCH_SIZE:
                        if not dry_run:
                            self.stdout.write(f"  Saving batch of {len(updates)} for {model._meta.label}...")
                            all_fields = file_picker_fields + gallery_picker_fields + image_picker_fields
                            model.objects.bulk_update(updates, all_fields)
                        updates = []

            if updates and not dry_run:
                self.stdout.write(f"  Saving final batch of {len(updates)} for {model._meta.label}...")
                all_fields = file_picker_fields + gallery_picker_fields + image_picker_fields
                model.objects.bulk_update(updates, all_fields)

        self.stdout.write(self.style.SUCCESS(f"Done. Processed {models_checked} models with relevant fields."))
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Would have modified {total_replacements} objects."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Successfully modified {total_replacements} objects."))
